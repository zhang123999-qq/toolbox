import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_RPC_URL,
  assertAddress,
  bigintToWord,
  bytesToHex,
  decodeOutputs,
  encodeArgs,
  encodeDynamic,
  encodeStatic,
  findFunction,
  functionSelector,
  hexToBytes,
  keccak256,
  parseAbi,
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

const ERC20_ABI = JSON.stringify([
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  { type: 'event', name: 'Transfer', inputs: [] },
])

function encodeAbiString(s: string): string {
  const bytes = new TextEncoder().encode(s)
  const words = [
    32n.toString(16).padStart(64, '0'),
    BigInt(bytes.length).toString(16).padStart(64, '0'),
  ]
  const padded = new Uint8Array(Math.ceil(bytes.length / 32) * 32)
  padded.set(bytes)
  words.push(bytesToHex(padded))
  return `0x${words.join('')}`
}

describe('contract-sim · keccak 与选择器', () => {
  it('keccak256 空串向量', () => {
    expect(bytesToHex(keccak256(new Uint8Array(0)))).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    )
  })

  it('balanceOf(address) 选择器为知名值', () => {
    expect(functionSelector('balanceOf', ['address'])).toBe('0x70a08231')
  })

  it('name() 选择器', () => {
    expect(functionSelector('name', [])).toBe('0x06fdde03')
  })
})

describe('contract-sim · hex/word 工具', () => {
  it('hexToBytes', () => {
    expect(hexToBytes('0x6162')).toEqual(new Uint8Array([0x61, 0x62]))
    expect(hexToBytes('6162')).toEqual(new Uint8Array([0x61, 0x62]))
  })

  it('hexToBytes 奇数位报错', () => {
    expect(() => hexToBytes('0x1')).toThrow('hex 格式错误')
  })

  it('hexToBytes 非法字符报错', () => {
    expect(() => hexToBytes('0xzz')).toThrow('hex 格式错误')
  })

  it('bigintToWord', () => {
    const w = bigintToWord(1n)
    expect(w.length).toBe(32)
    expect(w[31]).toBe(1)
  })

  it('bigintToWord 负数报错', () => {
    expect(() => bigintToWord(-1n)).toThrow('超出 uint256 范围')
  })

  it('bigintToWord 超大报错', () => {
    expect(() => bigintToWord(1n << 256n)).toThrow('超出 uint256 范围')
  })
})

describe('contract-sim · rpcCall', () => {
  it('成功返回 result', async () => {
    await expect(rpcCall('https://x.test', 'eth_call', [], okFetch)).resolves.toBe('0x1')
  })

  it('空 URL 报错', async () => {
    await expect(rpcCall('', 'm', [], okFetch)).rejects.toThrow('请输入 RPC 地址')
  })

  it('非 http(s) 报错', async () => {
    await expect(rpcCall('ws://x', 'm', [], okFetch)).rejects.toThrow('http')
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
    const f: FetchFn = () => Promise.resolve(jsonResponse({}, false, 429))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('HTTP 429')
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
    const f: FetchFn = () => Promise.resolve(jsonResponse('str'))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('格式异常')
  })

  it('RPC error 带 code', async () => {
    const f: FetchFn = () =>
      Promise.resolve(jsonResponse({ error: { code: 3, message: 'revert' } }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('revert')
  })

  it('RPC error 空对象', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ error: {} }))
    await expect(rpcCall('https://x.test', 'm', [], f)).rejects.toThrow('未知错误')
  })

  it('RPC error 为 null 视为成功', async () => {
    const f: FetchFn = () => Promise.resolve(jsonResponse({ result: '0x4', error: null }))
    await expect(rpcCall('https://x.test', 'm', [], f)).resolves.toBe('0x4')
  })
})

describe('contract-sim · parseAbi / findFunction', () => {
  it('解析出 3 个 function，忽略 event', () => {
    const fns = parseAbi(ERC20_ABI)
    expect(fns.map((f) => f.name)).toEqual(['balanceOf', 'name', 'transfer'])
    expect(fns[0].inputs).toEqual([{ name: 'account', type: 'address' }])
    expect(fns[0].stateMutability).toBe('view')
  })

  it('空 ABI 报错', () => {
    expect(() => parseAbi('  ')).toThrow('请输入 ABI')
  })

  it('非法 JSON 报错', () => {
    expect(() => parseAbi('{bad')).toThrow('ABI 不是合法 JSON')
  })

  it('非数组报错', () => {
    expect(() => parseAbi('{"a":1}')).toThrow('ABI 须为 JSON 数组')
  })

  it('无名 function 报错', () => {
    expect(() => parseAbi('[{"type":"function"}]')).toThrow('无名 function')
  })

  it('name 非字符串报错', () => {
    expect(() => parseAbi('[{"type":"function","name":1}]')).toThrow('无名 function')
  })

  it('inputs 非数组报错', () => {
    expect(() => parseAbi('[{"type":"function","name":"f","inputs":{}}]')).toThrow(
      'inputs 须为数组',
    )
  })

  it('param 缺 type 报错', () => {
    expect(() => parseAbi('[{"type":"function","name":"f","inputs":[{}]}]')).toThrow('缺少 type')
  })

  it('param 无 name 置空，缺 stateMutability 置空', () => {
    const fns = parseAbi('[{"type":"function","name":"f","inputs":[{"type":"uint256"}]}]')
    expect(fns[0].inputs).toEqual([{ name: '', type: 'uint256' }])
    expect(fns[0].outputs).toEqual([])
    expect(fns[0].stateMutability).toBe('')
  })

  it('stateMutability 非字符串置空', () => {
    const fns = parseAbi('[{"type":"function","name":"f","stateMutability":1}]')
    expect(fns[0].stateMutability).toBe('')
  })

  it('outputs 非数组报错', () => {
    expect(() => parseAbi('[{"type":"function","name":"f","outputs":1}]')).toThrow(
      'outputs 须为数组',
    )
  })

  it('findFunction 正常', () => {
    const fns = parseAbi(ERC20_ABI)
    expect(findFunction(fns, 'name').name).toBe('name')
  })

  it('findFunction 空名报错', () => {
    expect(() => findFunction(parseAbi(ERC20_ABI), '  ')).toThrow('请输入方法名')
  })

  it('findFunction 未找到报错', () => {
    expect(() => findFunction(parseAbi(ERC20_ABI), 'nope')).toThrow('未找到方法')
  })

  it('findFunction 重载报错', () => {
    const abi = JSON.stringify([
      { type: 'function', name: 'f', inputs: [{ type: 'uint256' }] },
      { type: 'function', name: 'f', inputs: [{ type: 'string' }] },
    ])
    expect(() => findFunction(parseAbi(abi), 'f')).toThrow('重载')
  })

  it('assertAddress', () => {
    expect(assertAddress('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')).toBe(
      '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
    )
    expect(() => assertAddress('0x123')).toThrow('合约地址格式错误')
  })
})

describe('contract-sim · encodeStatic', () => {
  it('uint256', () => {
    expect(bytesToHex(encodeStatic('uint256', '100'))).toBe('0'.repeat(62) + '64')
  })

  it('uint（默认 256）接受 number', () => {
    expect(bytesToHex(encodeStatic('uint', 255))).toBe('0'.repeat(62) + 'ff')
  })

  it('uint8 边界', () => {
    expect(bytesToHex(encodeStatic('uint8', 255))).toBe('0'.repeat(62) + 'ff')
    expect(() => encodeStatic('uint8', 256)).toThrow('超出 uint8 范围')
    expect(() => encodeStatic('uint256', -1)).toThrow('超出 uint256 范围')
  })

  it('非法 uint 位宽', () => {
    expect(() => encodeStatic('uint7', 1)).toThrow('非法 uint 位宽')
  })

  it('uintx 正则失败', () => {
    expect(() => encodeStatic('uintx', 1)).toThrow('暂不支持的参数类型')
  })

  it('int8 负数补码', () => {
    expect(bytesToHex(encodeStatic('int8', -1))).toBe('ff'.repeat(32))
  })

  it('int 范围检查', () => {
    expect(() => encodeStatic('int8', 128)).toThrow('超出 int8 范围')
    expect(() => encodeStatic('int8', -129)).toThrow('超出 int8 范围')
  })

  it('非法 int 位宽 / intx', () => {
    expect(() => encodeStatic('int7', 1)).toThrow('非法 int 位宽')
    expect(() => encodeStatic('intx', 1)).toThrow('暂不支持的参数类型')
  })

  it('int（默认 256）接受 bigint', () => {
    expect(bytesToHex(encodeStatic('int', 5n)).slice(62)).toBe('05')
  })

  it('address', () => {
    const w = encodeStatic('address', '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
    expect(bytesToHex(w)).toBe('0'.repeat(24) + '7e5f4552091a69125d5dfcb7b8c2659029395bdf')
  })

  it('address 非法报错', () => {
    expect(() => encodeStatic('address', '0x123')).toThrow('40 位十六进制地址')
  })

  it('bool', () => {
    expect(encodeStatic('bool', true)[31]).toBe(1)
    expect(encodeStatic('bool', false)[31]).toBe(0)
    expect(() => encodeStatic('bool', 1)).toThrow('true/false')
  })

  it('bytes4', () => {
    expect(bytesToHex(encodeStatic('bytes4', '0xdeadbeef'))).toBe('deadbeef' + '00'.repeat(28))
  })

  it('bytesN 位宽越界', () => {
    expect(() => encodeStatic('bytes33', '0x00')).toThrow('N 须在 1..32')
    expect(() => encodeStatic('bytes0', '0x00')).toThrow('N 须在 1..32')
  })

  it('bytesN 非 hex 报错', () => {
    expect(() => encodeStatic('bytes4', 'zz')).toThrow('十六进制字符串')
  })

  it('bytesN 长度不符报错', () => {
    expect(() => encodeStatic('bytes4', '0xdead')).toThrow('长度须为 4 字节')
  })

  it('tuple 暂不支持', () => {
    expect(() => encodeStatic('tuple', 1)).toThrow('暂不支持的参数类型')
  })

  it('number 非整数报错', () => {
    expect(() => encodeStatic('uint256', 1.5)).toThrow('安全范围内')
  })

  it('number 超安全范围报错', () => {
    expect(() => encodeStatic('uint256', Number.MAX_SAFE_INTEGER + 1)).toThrow('安全范围内')
  })

  it('字符串非十进制报错', () => {
    expect(() => encodeStatic('uint256', 'abc')).toThrow('十进制整数')
  })

  it('非法值类型报错', () => {
    expect(() => encodeStatic('uint256', true)).toThrow('须为整数')
  })
})

describe('contract-sim · encodeDynamic / encodeArgs', () => {
  it('string 动态编码', () => {
    const hex = encodeArgs(['string'], ['hi'])
    // head: offset=32；tail: len=2 + 'hi' 补齐
    expect(hex.slice(0, 64)).toBe(`${'0'.repeat(62)}20`)
    expect(hex.slice(64, 128)).toBe(`${'0'.repeat(62)}02`)
  })

  it('string 非字符串报错', () => {
    expect(() => encodeDynamic('string', 1)).toThrow('须为字符串')
  })

  it('bytes 动态编码', () => {
    const b = encodeDynamic('bytes', '0xdead')
    expect(bytesToHex(b)).toBe('dead')
  })

  it('bytes 非法报错', () => {
    expect(() => encodeDynamic('bytes', 'zz')).toThrow('十六进制字符串')
  })

  it('数组类型暂不支持', () => {
    expect(() => encodeDynamic('uint256[]', [])).toThrow('暂不支持')
  })

  it('混合静态+动态编码', () => {
    const hex = encodeArgs(
      ['address', 'string'],
      ['0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf', 'ab'],
    )
    expect(hex.length).toBe(64 * 4)
    // head[1] = offset 64
    expect(hex.slice(64, 128)).toBe('0'.repeat(62) + '40')
  })

  it('参数数量不匹配', () => {
    expect(() => encodeArgs(['uint256'], [])).toThrow('参数数量不匹配')
  })

  it('空参数', () => {
    expect(encodeArgs([], [])).toBe('')
  })
})

describe('contract-sim · decodeOutputs', () => {
  it('无返回值', () => {
    expect(decodeOutputs([], '0x')).toBe('（无返回值）')
  })

  it('uint256 解码', () => {
    const data = `0x${'0'.repeat(62)}64`
    expect(decodeOutputs([{ name: 'bal', type: 'uint256' }], data)).toBe('bal = 100')
  })

  it('int8 负数解码', () => {
    const data = `0x${'ff'.repeat(32)}`
    expect(decodeOutputs([{ name: '', type: 'int8' }], data)).toBe('#0 = -1')
  })

  it('int256 正数解码', () => {
    const data = `0x${'0'.repeat(62)}7f`
    expect(decodeOutputs([{ name: 'n', type: 'int256' }], data)).toBe('n = 127')
  })

  it('address 解码', () => {
    const data = `0x${'0'.repeat(24)}7e5f4552091a69125d5dfcb7b8c2659029395bdf`
    expect(decodeOutputs([{ name: 'a', type: 'address' }], data)).toBe(
      'a = 0x7e5f4552091a69125d5dfcb7b8c2659029395bdf',
    )
  })

  it('bool 解码', () => {
    expect(decodeOutputs([{ name: 'ok', type: 'bool' }], `0x${'0'.repeat(63)}1`)).toBe('ok = true')
    expect(decodeOutputs([{ name: 'ok', type: 'bool' }], `0x${'0'.repeat(64)}`)).toBe('ok = false')
  })

  it('bytes4 解码', () => {
    expect(decodeOutputs([{ name: 'b', type: 'bytes4' }], `0xdeadbeef${'00'.repeat(28)}`)).toBe(
      'b = 0xdeadbeef',
    )
  })

  it('string 动态解码', () => {
    expect(decodeOutputs([{ name: 'n', type: 'string' }], encodeAbiString('Tether USD'))).toBe(
      'n = Tether USD',
    )
  })

  it('bytes 动态解码', () => {
    const data = encodeAbiString('') // offset+len(0)，内容为空
    expect(decodeOutputs([{ name: 'd', type: 'bytes' }], data)).toBe('d = 0x')
  })

  it('未知类型按原样展示', () => {
    const data = `0x${'ab'.repeat(32)}`
    expect(decodeOutputs([{ name: 't', type: 'tuple' }], data)).toContain('按原样展示')
  })

  it('非法 hex 报错', () => {
    expect(() => decodeOutputs([{ name: 'a', type: 'uint256' }], 'zz')).toThrow('格式错误')
  })

  it('奇数位 hex 报错', () => {
    expect(() => decodeOutputs([{ name: 'a', type: 'uint256' }], '0x1')).toThrow('格式错误')
  })

  it('空返回报错（可能 revert）', () => {
    expect(() => decodeOutputs([{ name: 'a', type: 'uint256' }], '0x')).toThrow('revert')
  })

  it('数据长度不足报错', () => {
    expect(() => decodeOutputs([{ name: 'a', type: 'uint256' }], '0x1234')).toThrow('长度不足')
  })

  it('动态偏移越界报错', () => {
    const data = `0x${1000n.toString(16).padStart(64, '0')}`
    expect(() => decodeOutputs([{ name: 's', type: 'string' }], data)).toThrow('长度不足')
  })
})

describe('contract-sim · transform', () => {
  const contract = '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf'
  const opts = { contract, abi: ERC20_ABI, method: 'balanceOf', rpcUrl: '' }

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
    await expect(transform({ text: '1'.repeat(200001) }, opts)).rejects.toThrow('200,000')
  })

  it('balanceOf 完整流程', async () => {
    const { spy, restore } = stubFetch(`0x${'0'.repeat(62)}64`)
    try {
      const out = await transform({ text: '["0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf"]' }, opts)
      expect(out).toContain('方法：balanceOf(address)')
      expect(out).toContain('调用数据：0x70a08231')
      expect(out).toContain('#0 = 100')
      expect(spy.mock.calls[0][0]).toBe(DEFAULT_RPC_URL)
      const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
      expect(body.method).toBe('eth_call')
      expect(body.params[1]).toBe('latest')
    } finally {
      restore()
    }
  })

  it('无参方法空输入', async () => {
    const { restore } = stubFetch(encodeAbiString('Tether'))
    try {
      const out = await transform({ text: '  ' }, { ...opts, method: 'name' })
      expect(out).toContain('方法：name()')
      expect(out).toContain('#0 = Tether')
    } finally {
      restore()
    }
  })

  it('非 view 方法给出只读提示', async () => {
    const { restore } = stubFetch(`0x${'0'.repeat(63)}1`)
    try {
      const out = await transform(
        { text: '["0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf", 100]' },
        { ...opts, method: 'transfer' },
      )
      expect(out).toContain('不会真正上链')
      expect(out).toContain('#0 = true')
    } finally {
      restore()
    }
  })

  it('自定义 RPC', async () => {
    const { spy, restore } = stubFetch(`0x${'0'.repeat(64)}`)
    try {
      await transform({ text: '[]' }, { ...opts, method: 'name', rpcUrl: 'https://my.rpc' })
      expect(spy.mock.calls[0][0]).toBe('https://my.rpc')
    } finally {
      restore()
    }
  })

  it('参数非法 JSON 报错', async () => {
    await expect(transform({ text: '{bad' }, opts)).rejects.toThrow('合法 JSON')
  })

  it('参数非数组报错', () => {
    return expect(transform({ text: '{"a":1}' }, opts)).rejects.toThrow('须为 JSON 数组')
  })

  it('参数数量不匹配透出', async () => {
    await expect(transform({ text: '[]' }, opts)).rejects.toThrow('参数数量不匹配')
  })

  it('eth_call 非 string 报错', async () => {
    const { restore } = stubFetch(123)
    try {
      await expect(transform({ text: '[]' }, { ...opts, method: 'name' })).rejects.toThrow(
        'eth_call 返回格式异常',
      )
    } finally {
      restore()
    }
  })

  it('非法合约地址透出', async () => {
    await expect(transform({ text: '[]' }, { ...opts, contract: '0x1' })).rejects.toThrow(
      '合约地址格式错误',
    )
  })
})
