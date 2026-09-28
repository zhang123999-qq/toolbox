import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RPC_URL,
  assertAddress,
  assertTxHash,
  buildQueryPayload,
  formatBalance,
  formatBlock,
  formatTransaction,
  hexToBigInt,
  parseBlockTag,
  rpcCall,
  transform,
  type FetchFn,
} from './utils'

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: () => Promise.resolve(body) } as Response
}

const okFetch: FetchFn = () =>
  Promise.resolve(jsonResponse({ jsonrpc: '2.0', id: 1, result: '0x1' }))

const hangingFetch: FetchFn = (_url, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('aborted', 'AbortError'))
    })
  })

describe('chain-query · rpcCall', () => {
  it('成功返回 result', async () => {
    await expect(rpcCall('https://x.test', 'eth_blockNumber', [], okFetch)).resolves.toBe('0x1')
  })

  it('空 URL 报错', async () => {
    await expect(rpcCall('', 'm', [], okFetch)).rejects.toThrow('请输入 RPC 地址')
  })

  it('非 http(s) 报错', async () => {
    await expect(rpcCall('ws://x.test', 'm', [], okFetch)).rejects.toThrow('http')
  })

  it('超时中文报错', async () => {
    await expect(rpcCall('https://x.test', 'm', [], hangingFetch, 20)).rejects.toThrow('超时')
  })

  it('网络错误中文报错', async () => {
    const f: FetchFn = () => Promise.reject(new Error('down'))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('网络请求失败')
  })

  it('非 Error throw 被包装', async () => {
    const f: FetchFn = () => Promise.reject('nope')
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('nope')
  })

  it('HTTP 错误', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({}, false, 503))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('HTTP 503')
  })

  it('非法 JSON', async () => {
    const f: FetchFn = () =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('x')),
      } as Response)
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('合法 JSON')
  })

  it('非对象响应', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse(42))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('格式异常')
  })

  it('RPC error 带 code', async () => {
    const f: FetchFn = () =>
      Promise.resolve(jsonResponse({ error: { code: -32000, message: 'oops' } }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('-32000')
  })

  it('RPC error 空对象', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ error: {} }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('未知错误')
  })

  it('RPC error 为 null 视为成功', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ result: '0x2', error: null }))
    await expect(rpcCall('https://x.test', 'm', [], f)).resolves.toBe('0x2')
  })

  it('默认 RPC 常量', () => {
    expect(DEFAULT_RPC_URL).toBe('https://eth.llamarpc.com')
  })
})

describe('chain-query · hexToBigInt', () => {
  it('正常解析', () => {
    expect(hexToBigInt('0x10')).toBe(16n)
  })

  it('非法格式报错', () => {
    expect(() => hexToBigInt('10')).toThrow('hex 格式错误')
  })
})

describe('chain-query · assertAddress', () => {
  it('合法地址通过', () => {
    expect(assertAddress('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')).toBe(
      '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
    )
  })

  it('非法地址报错', () => {
    expect(() => assertAddress('0x123')).toThrow('地址格式错误')
  })
})

describe('chain-query · assertTxHash', () => {
  it('合法哈希通过', () => {
    const h = '0x' + 'ab'.repeat(32)
    expect(assertTxHash(h)).toBe(h)
  })

  it('非法哈希报错', () => {
    expect(() => assertTxHash('0x123')).toThrow('交易哈希格式错误')
  })
})

describe('chain-query · parseBlockTag', () => {
  it('空输入报错', () => {
    expect(() => parseBlockTag('  ')).toThrow('请输入区块号')
  })

  it('latest/earliest/pending', () => {
    expect(parseBlockTag('latest')).toBe('latest')
    expect(parseBlockTag('Earliest')).toBe('earliest')
    expect(parseBlockTag('pending')).toBe('pending')
  })

  it('十进制转 hex', () => {
    expect(parseBlockTag('21000000')).toBe('0x1406f40')
  })

  it('0x hex 保持', () => {
    expect(parseBlockTag('0x1406f40')).toBe('0x1406f40')
  })

  it('非法格式报错', () => {
    expect(() => parseBlockTag('abc')).toThrow('区块号格式错误')
  })
})

describe('chain-query · buildQueryPayload', () => {
  const addr = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'
  const hash = '0x' + 'ab'.repeat(32)

  it('余额查询', () => {
    expect(buildQueryPayload('余额查询', addr)).toEqual({
      method: 'eth_getBalance',
      params: [addr, 'latest'],
    })
  })

  it('交易查询', () => {
    expect(buildQueryPayload('交易查询', hash)).toEqual({
      method: 'eth_getTransactionByHash',
      params: [hash],
    })
  })

  it('区块查询', () => {
    expect(buildQueryPayload('区块查询', 'latest')).toEqual({
      method: 'eth_getBlockByNumber',
      params: ['latest', false],
    })
  })

  it('未知类型报错', () => {
    expect(() => buildQueryPayload('未知', 'x')).toThrow('未知查询类型')
  })
})

describe('chain-query · formatBalance', () => {
  it('1 ETH 三档输出', () => {
    const out = formatBalance('0xde0b6b3a7640000')
    expect(out).toContain('余额：1 ETH')
    expect(out).toContain('1000000000 gwei')
    expect(out).toContain('1000000000000000000 wei')
  })

  it('带小数的余额去尾零', () => {
    const out = formatBalance('0x14d1120d7b160000')
    expect(out).toContain('余额：1.5 ETH')
  })

  it('非 string 报错', () => {
    expect(() => formatBalance(123)).toThrow('格式异常')
  })
})

describe('chain-query · formatTransaction', () => {
  const baseTx = {
    hash: '0x' + 'ab'.repeat(32),
    blockNumber: '0x1406f40',
    from: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '0xde0b6b3a7640000',
    nonce: '0x7',
    gasPrice: '0x4a817c800',
    gas: '0x5208',
    input: '0x',
  }

  it('完整交易渲染', () => {
    const out = formatTransaction(baseTx)
    expect(out).toContain('已上链（区块 21000000）')
    expect(out).toContain('金额：1 ETH')
    expect(out).toContain('Nonce：7')
    expect(out).toContain('Gas Price：20 gwei')
    expect(out).toContain('Gas Limit：21000')
  })

  it('待打包交易', () => {
    const out = formatTransaction({ ...baseTx, blockNumber: null })
    expect(out).toContain('待打包')
  })

  it('合约创建（to 为空）', () => {
    const out = formatTransaction({ ...baseTx, to: null })
    expect(out).toContain('接收方：合约创建')
  })

  it('EIP-1559 用 maxFeePerGas', () => {
    const { gasPrice: _g, ...rest } = baseTx
    const out = formatTransaction({ ...rest, maxFeePerGas: '0x3b9aca00' })
    expect(out).toContain('Gas Price：1 gwei')
  })

  it('两者都无默认 0x0', () => {
    const { gasPrice: _g, ...rest } = baseTx
    const out = formatTransaction(rest)
    expect(out).toContain('Gas Price：0 gwei')
  })

  it('长 input 截断', () => {
    const out = formatTransaction({ ...baseTx, input: '0x' + 'ff'.repeat(100) })
    expect(out).toContain('…（共 100 字节）')
  })

  it('缺字段用未知占位', () => {
    const out = formatTransaction({})
    expect(out).toContain('交易哈希：未知')
    expect(out).toContain('发送方：未知')
  })

  it('null 结果报错未找到', () => {
    expect(() => formatTransaction(null)).toThrow('未找到该交易')
  })

  it('undefined 结果报错未找到', () => {
    expect(() => formatTransaction(undefined)).toThrow('未找到该交易')
  })

  it('非对象结果报错', () => {
    expect(() => formatTransaction('str')).toThrow('格式异常')
  })
})

describe('chain-query · formatBlock', () => {
  const block = {
    number: '0x1406f40',
    hash: '0x' + 'cc'.repeat(32),
    parentHash: '0x' + 'dd'.repeat(32),
    timestamp: '0x66b0f400',
    miner: '0x3333333333333333333333333333333333333333',
    gasLimit: '0x1c9c380',
    gasUsed: '0x5208',
    transactions: ['0x1', '0x2'],
  }

  it('完整区块渲染', () => {
    const out = formatBlock(block)
    expect(out).toContain('区块高度：21000000')
    expect(out).toContain('交易数：2')
    expect(out).toContain('Gas Used：21000')
    expect(out).toContain('unix 1722872832')
  })

  it('无交易列表按 0 计', () => {
    const { transactions: _t, ...rest } = block
    expect(formatBlock(rest)).toContain('交易数：0')
  })

  it('缺字段用未知占位', () => {
    const out = formatBlock({})
    expect(out).toContain('区块哈希：未知')
    expect(out).toContain('矿工/出块方：未知')
  })

  it('null 报错未找到', () => {
    expect(() => formatBlock(null)).toThrow('未找到该区块')
  })

  it('undefined 报错未找到', () => {
    expect(() => formatBlock(undefined)).toThrow('未找到该区块')
  })

  it('非对象报错', () => {
    expect(() => formatBlock(7)).toThrow('格式异常')
  })
})

describe('chain-query · transform', () => {
  const addr = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'

  function stubFetch(result: unknown) {
    const spy = vi.fn((_u: string, _i?: RequestInit) =>
      Promise.resolve(jsonResponse({ jsonrpc: '2.0', id: 1, result })),
    )
    const realFetch = globalThis.fetch
    globalThis.fetch = spy as unknown as typeof fetch
    return {
      spy,
      restore: () => {
        globalThis.fetch = realFetch
      },
    }
  }

  it('超长输入报错', async () => {
    await expect(
      transform({ text: '1'.repeat(200001) }, { kind: '余额查询', rpcUrl: '' }),
    ).rejects.toThrow('200,000')
  })

  it('空输入报错', async () => {
    await expect(transform({ text: '  ' }, { kind: '余额查询', rpcUrl: '' })).rejects.toThrow(
      '请输入查询内容',
    )
  })

  it('余额查询走默认 RPC', async () => {
    const { spy, restore } = stubFetch('0xde0b6b3a7640000')
    try {
      const out = await transform({ text: addr }, { kind: '余额查询', rpcUrl: '' })
      expect(out).toContain('余额：1 ETH')
      expect(spy.mock.calls[0][0]).toBe(DEFAULT_RPC_URL)
    } finally {
      restore()
    }
  })

  it('交易查询用自定义 RPC', async () => {
    const { spy, restore } = stubFetch(null)
    try {
      await expect(
        transform({ text: '0x' + 'ab'.repeat(32) }, { kind: '交易查询', rpcUrl: 'https://my.rpc' }),
      ).rejects.toThrow('未找到该交易')
      expect(spy.mock.calls[0][0]).toBe('https://my.rpc')
    } finally {
      restore()
    }
  })

  it('区块查询', async () => {
    const { restore } = stubFetch({
      number: '0x1',
      hash: '0x' + 'cc'.repeat(32),
      timestamp: '0x0',
      transactions: [],
    })
    try {
      const out = await transform({ text: 'latest' }, { kind: '区块查询', rpcUrl: '' })
      expect(out).toContain('区块高度：1')
    } finally {
      restore()
    }
  })

  it('未知类型报错', async () => {
    await expect(transform({ text: addr }, { kind: '未知', rpcUrl: '' })).rejects.toThrow(
      '未知查询类型',
    )
  })
})
