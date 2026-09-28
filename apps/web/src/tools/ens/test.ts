/**
 * ens（#706）utils 单测：namehash 官方向量 / eth_call 链上解析（fetch 全 mock，不联网）。
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RPC_URL,
  ethCall,
  namehashHex,
  normalizeName,
  resolveEnsName,
  type FetchFn,
} from './utils'

const okFetch =
  (result: unknown): FetchFn =>
  async () => ({
    ok: true,
    status: 200,
    json: async () => result,
  })

describe('namehash（EIP-137 官方向量）', () => {
  it('空名称为全零', () => {
    expect(namehashHex('')).toBe('00'.repeat(32))
  })
  it('eth', () => {
    expect(namehashHex('eth')).toBe(
      '93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae',
    )
  })
  it('vitalik.eth', () => {
    expect(namehashHex('vitalik.eth')).toBe(
      'ee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a53475835',
    )
  })
  it('test.eth', () => {
    expect(namehashHex('test.eth')).toBe(
      'eb4f647bea6caa36333c816d7b46fdcb05f9466ecacc140ea8c66faf15b3d9f1',
    )
  })
  it('规范化：去空白 + 小写', () => {
    expect(normalizeName('  Vitalik.ETH ')).toBe('vitalik.eth')
    expect(namehashHex('  Vitalik.ETH ')).toBe(namehashHex('vitalik.eth'))
  })
  it('空标签抛错', () => {
    expect(() => namehashHex('a..eth')).toThrow('空标签')
    expect(() => namehashHex('.eth')).toThrow('空标签')
  })
})

describe('ethCall', () => {
  it('成功返回 result', async () => {
    const res = await ethCall('https://rpc.test', '0xabc', '0x1234', okFetch({ result: '0x1234' }))
    expect(res).toBe('0x1234')
  })
  it('RPC 地址格式错误', async () => {
    await expect(ethCall('ftp://x', '0xabc', '0x', okFetch({ result: '0x' }))).rejects.toThrow(
      'RPC 地址格式错误',
    )
  })
  it('HTTP 错误', async () => {
    const f: FetchFn = async () => ({ ok: false, status: 429, json: async () => ({}) })
    await expect(ethCall('https://rpc.test', '0xabc', '0x', f)).rejects.toThrow('HTTP 429')
  })
  it('JSON-RPC 错误（带 message / 仅 code）', async () => {
    await expect(
      ethCall(
        'https://rpc.test',
        '0xabc',
        '0x',
        okFetch({ error: { message: 'boom', code: -32000 } }),
      ),
    ).rejects.toThrow('RPC 错误：boom')
    await expect(
      ethCall('https://rpc.test', '0xabc', '0x', okFetch({ error: { code: -32000 } })),
    ).rejects.toThrow('code -32000')
  })
  it('result 非法', async () => {
    await expect(
      ethCall('https://rpc.test', '0xabc', '0x', okFetch({ result: 123 })),
    ).rejects.toThrow('result 不是十六进制')
    await expect(
      ethCall('https://rpc.test', '0xabc', '0x', okFetch({ result: '0xzz' })),
    ).rejects.toThrow('result 不是十六进制')
  })
  it('网络异常', async () => {
    const f: FetchFn = async () => {
      throw new Error('connection reset')
    }
    await expect(ethCall('https://rpc.test', '0xabc', '0x', f)).rejects.toThrow(
      '网络请求失败：connection reset',
    )
  })
  it('超时', async () => {
    const hanging: FetchFn = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'))
        })
      })
    await expect(ethCall('https://rpc.test', '0xabc', '0x', hanging, 30)).rejects.toThrow(
      '请求超时',
    )
  })
})

describe('resolveEnsName', () => {
  const resolverWord = `0x${'00'.repeat(12)}${'11'.repeat(20)}`
  const addrWord = `0x${'00'.repeat(12)}${'22'.repeat(20)}`
  const twoCalls: FetchFn = async (_url, init) => {
    const body = String(init?.body ?? '')
    const result = body.includes('0178b8bf') ? resolverWord : addrWord
    return { ok: true, status: 200, json: async () => ({ result }) }
  }

  it('两次 eth_call 成功解析', async () => {
    const res = await resolveEnsName('vitalik.eth', DEFAULT_RPC_URL, twoCalls)
    expect(res.name).toBe('vitalik.eth')
    expect(res.node).toBe('ee6c4522aab0003e8d14cd40a6af439055fd2577951148c14b6cea9a53475835')
    expect(res.resolver).toBe(`0x${'11'.repeat(20)}`)
    expect(res.address).toBe(`0x${'22'.repeat(20)}`)
  })
  it('空名称抛错', async () => {
    await expect(resolveEnsName('   ', DEFAULT_RPC_URL, twoCalls)).rejects.toThrow('名称不能为空')
  })
  it('未设置 resolver 抛错', async () => {
    const f: FetchFn = async (_url, init) => {
      const body = String(init?.body ?? '')
      const result = body.includes('0178b8bf') ? `0x${'00'.repeat(32)}` : addrWord
      return { ok: true, status: 200, json: async () => ({ result }) }
    }
    await expect(resolveEnsName('vitalik.eth', DEFAULT_RPC_URL, f)).rejects.toThrow(
      '未设置 resolver',
    )
  })
  it('未设置地址记录抛错', async () => {
    const f: FetchFn = async (_url, init) => {
      const body = String(init?.body ?? '')
      const result = body.includes('0178b8bf') ? resolverWord : `0x${'00'.repeat(32)}`
      return { ok: true, status: 200, json: async () => ({ result }) }
    }
    await expect(resolveEnsName('vitalik.eth', DEFAULT_RPC_URL, f)).rejects.toThrow(
      '未设置地址记录',
    )
  })
  it('默认参数可用（不真实调用，仅校验签名）', () => {
    expect(typeof resolveEnsName).toBe('function')
    expect(DEFAULT_RPC_URL).toMatch(/^https:\/\//)
  })
})

describe('ethCall 分支补齐', () => {
  it('fetch 抛非 Error 值时包装为字符串', async () => {
    const f: FetchFn = async () => {
      throw 'plain string failure'
    }
    await expect(ethCall('https://rpc.test', '0xabc', '0x', f)).rejects.toThrow(
      '网络请求失败：plain string failure',
    )
  })
})
