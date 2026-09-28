import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RPC_URL,
  calcGasFee,
  getGasPrice,
  hexToBigInt,
  parseGasLimit,
  parseGweiToWei,
  presetGasLimit,
  rpcCall,
  transform,
  type FetchFn,
} from './utils'

/* ---------- 测试用 fetch mock ---------- */

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response
}

const okFetch: FetchFn = () =>
  Promise.resolve(jsonResponse({ jsonrpc: '2.0', id: 1, result: '0x4a817c800' }))

const hangingFetch: FetchFn = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('aborted', 'AbortError'))
    })
  })

describe('gas · rpcCall', () => {
  it('成功返回 result', async () => {
    const r = await rpcCall('https://x.test', 'eth_gasPrice', [], okFetch)
    expect(r).toBe('0x4a817c800')
  })

  it('空 URL 报错', async () => {
    await expect(rpcCall('  ', 'm', [], okFetch)).rejects.toThrow('请输入 RPC 地址')
  })

  it('非 http(s) 地址报错', async () => {
    await expect(rpcCall('ftp://x.test', 'm', [], okFetch)).rejects.toThrow('http')
  })

  it('超时转为中文错误', async () => {
    await expect(rpcCall('https://x.test', 'm', [], hangingFetch, 20)).rejects.toThrow('超时')
  })

  it('网络错误转为中文错误', async () => {
    const bad: FetchFn = () => Promise.reject(new Error('boom'))
    await expect(rpcCall('https://x.test', 'm', [], bad)).rejects.toThrow('网络请求失败')
  })

  it('非 Error 的 throw 也被包装', async () => {
    const bad: FetchFn = () => Promise.reject('string-failure')
    await expect(rpcCall('https://x.test', 'm', [], bad)).rejects.toThrow('string-failure')
  })

  it('HTTP 非 2xx 报错', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({}, false, 429))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('HTTP 429')
  })

  it('非法 JSON 报错', async () => {
    const f: FetchFn = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('x')),
      } as Response)
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('合法 JSON')
  })

  it('返回非对象报错', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse('str'))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('格式异常')
  })

  it('RPC error 字段带 code', async () => {
    const f: FetchFn = () =>
      Promise.resolve(jsonResponse({ error: { code: -32602, message: 'bad params' } }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('-32602')
  })

  it('RPC error 无 code 无 message', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ error: {} }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('未知错误')
  })

  it('RPC error 为 null 视为成功', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ result: '0x1', error: null }))
    await expect(rpcCall('https://x.test', 'm', [], f)).resolves.toBe('0x1')
  })

  it('请求体为 JSON-RPC 2.0', async () => {
    const spy = vi.fn((_u: string, _i?: RequestInit) =>
      Promise.resolve(jsonResponse({ result: null })),
    )
    await rpcCall('https://x.test', 'eth_blockNumber', ['latest'], spy, 5000)
    const init = spy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_blockNumber',
      params: ['latest'],
    })
  })

  it('默认 RPC 地址常量', () => {
    expect(DEFAULT_RPC_URL).toBe('https://eth.llamarpc.com')
  })
})

describe('gas · hexToBigInt', () => {
  it('正常解析', () => {
    expect(hexToBigInt('0x4a817c800')).toBe(20000000000n)
    expect(hexToBigInt('0Xff')).toBe(255n)
  })

  it('非法格式报错', () => {
    expect(() => hexToBigInt('zz')).toThrow('hex 格式错误')
    expect(() => hexToBigInt('0x')).toThrow('hex 格式错误')
  })
})

describe('gas · parseGweiToWei', () => {
  it('整数 gwei', () => {
    expect(parseGweiToWei('20')).toBe(20000000000n)
  })

  it('小数 gwei', () => {
    expect(parseGweiToWei('20.5')).toBe(20500000000n)
    expect(parseGweiToWei('0.000000001')).toBe(1n)
  })

  it('千分位逗号', () => {
    expect(parseGweiToWei('1,000')).toBe(1000000000000n)
  })

  it('空输入报错', () => {
    expect(() => parseGweiToWei('  ')).toThrow('请输入')
  })

  it('非法格式报错', () => {
    expect(() => parseGweiToWei('abc')).toThrow('格式错误')
    expect(() => parseGweiToWei('-1')).toThrow('格式错误')
  })

  it('超过 9 位小数报错', () => {
    expect(() => parseGweiToWei('1.0000000001')).toThrow('9 位')
  })
})

describe('gas · parseGasLimit', () => {
  it('正常解析', () => {
    expect(parseGasLimit('21000')).toBe(21000n)
    expect(parseGasLimit(' 65,000 ')).toBe(65000n)
  })

  it('空输入报错', () => {
    expect(() => parseGasLimit('')).toThrow('请输入')
  })

  it('非法格式报错', () => {
    expect(() => parseGasLimit('2.5')).toThrow('格式错误')
  })

  it('零报错', () => {
    expect(() => parseGasLimit('0')).toThrow('大于 0')
  })
})

describe('gas · calcGasFee', () => {
  it('20 gwei × 21000', () => {
    const fee = calcGasFee(20000000000n, 21000n)
    expect(fee.wei).toBe('420000000000000')
    expect(fee.gwei).toBe('420000')
    expect(fee.ether).toBe('0.00042')
  })

  it('零费用', () => {
    const fee = calcGasFee(0n, 21000n)
    expect(fee.ether).toBe('0')
  })
})

describe('gas · presetGasLimit', () => {
  it('手动输入返回 null', () => {
    expect(presetGasLimit('手动输入')).toBeNull()
  })

  it('预设提取数字', () => {
    expect(presetGasLimit('转账 21000')).toBe(21000n)
    expect(presetGasLimit('NFT 铸造 150000')).toBe(150000n)
  })

  it('无数字尾缀返回 null', () => {
    expect(presetGasLimit('未知预设')).toBeNull()
  })
})

describe('gas · getGasPrice', () => {
  it('解析 eth_gasPrice', async () => {
    // 0x4a817c800 = 20000000000 wei = 20 gwei
    await expect(getGasPrice('https://x.test', okFetch)).resolves.toBe('20')
  })

  it('非 string 结果报错', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ result: 123 }))
    await expect(getGasPrice('https://x.test', f)).rejects.toThrow('格式异常')
  })
})

describe('gas · transform', () => {
  const calcOpts = { mode: '计算器', gasLimit: '21000', preset: '手动输入', rpcUrl: '' }

  it('超长输入报错', async () => {
    await expect(transform({ text: '1'.repeat(200001) }, calcOpts)).rejects.toThrow('200,000')
  })

  it('计算器模式输出三档单位', async () => {
    const out = await transform({ text: '20' }, calcOpts)
    expect(out).toContain('Gas Price：20 gwei')
    expect(out).toContain('Gas Limit：21000')
    expect(out).toContain('0.00042 ETH')
    expect(out).toContain('420000 gwei')
    expect(out).toContain('420000000000000 wei')
  })

  it('预设覆盖手动 gasLimit', async () => {
    const out = await transform({ text: '20' }, { ...calcOpts, preset: 'ERC20 转账 65000' })
    expect(out).toContain('Gas Limit：65000')
  })

  it('非法 gasPrice 透出中文错误', async () => {
    await expect(transform({ text: 'abc' }, calcOpts)).rejects.toThrow('格式错误')
  })

  it('实时查询模式（mock fetch 需注入——transform 用全局 fetch，此处只测空 rpcUrl 回退逻辑）', async () => {
    // 通过直接调用 getGasPrice 验证回退由 transform 完成；此处用 vi  stub 全局 fetch
    const spy = vi.fn((_u: string, _i?: RequestInit) =>
      Promise.resolve(jsonResponse({ result: '0x4a817c800' })),
    )
    const realFetch = globalThis.fetch
    globalThis.fetch = spy as unknown as typeof fetch
    try {
      const out = await transform(
        { text: '' },
        { mode: '实时查询', gasLimit: '21000', preset: '手动输入', rpcUrl: '' },
      )
      expect(out).toContain('当前 Gas Price：20 gwei')
      expect(spy.mock.calls[0][0]).toBe(DEFAULT_RPC_URL)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('实时查询用自定义 RPC 地址', async () => {
    const spy = vi.fn((_u: string, _i?: RequestInit) =>
      Promise.resolve(jsonResponse({ result: '0x3b9aca00' })),
    )
    const realFetch = globalThis.fetch
    globalThis.fetch = spy as unknown as typeof fetch
    try {
      const out = await transform(
        { text: '' },
        { mode: '实时查询', gasLimit: '21000', preset: '手动输入', rpcUrl: 'https://my.rpc' },
      )
      expect(out).toContain('当前 Gas Price：1 gwei')
      expect(spy.mock.calls[0][0]).toBe('https://my.rpc')
    } finally {
      globalThis.fetch = realFetch
    }
  })
})
