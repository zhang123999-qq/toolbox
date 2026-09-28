/**
 * abi-codec（#695）utils 单测：类型解析 / 编解码 / 选择器 / 错误分支。
 * 编码向量由 Python eth-abi 独立生成；transfer 选择器为公认值。
 */
import { describe, expect, it } from 'vitest'
import {
  abiDecode,
  abiEncode,
  bytesToHex,
  canonicalType,
  concatBytes,
  decodeFunctionCall,
  encodeDynamic,
  encodeFunctionCall,
  encodeStatic,
  functionSelector,
  hexToBytes,
  isDynamicType,
  keccak256,
  parseJsonArray,
  parseSignature,
  parseType,
  toChecksumAddress,
  wordFromBigint,
  wordToBigint,
  type DynamicAbiType,
  type StaticAbiType,
} from './utils'

const ADDRESS = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
const ADDRESS_LOWER = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'

describe('parseType', () => {
  it('基本类型', () => {
    expect(parseType('uint256')).toEqual({ kind: 'uint', bits: 256 })
    expect(parseType('uint')).toEqual({ kind: 'uint', bits: 256 })
    expect(parseType('uint8')).toEqual({ kind: 'uint', bits: 8 })
    expect(parseType('int')).toEqual({ kind: 'int', bits: 256 })
    expect(parseType('int128')).toEqual({ kind: 'int', bits: 128 })
    expect(parseType('address')).toEqual({ kind: 'address' })
    expect(parseType('bool')).toEqual({ kind: 'bool' })
    expect(parseType('bytes32')).toEqual({ kind: 'bytesN', size: 32 })
    expect(parseType('bytes1')).toEqual({ kind: 'bytesN', size: 1 })
    expect(parseType('bytes')).toEqual({ kind: 'bytes' })
    expect(parseType('string')).toEqual({ kind: 'string' })
  })

  it('数组类型', () => {
    expect(parseType('uint256[]')).toEqual({
      kind: 'array',
      elem: { kind: 'uint', bits: 256 },
      length: null,
    })
    expect(parseType('address[3]')).toEqual({
      kind: 'array',
      elem: { kind: 'address' },
      length: 3,
    })
    expect(parseType('uint256[][]')).toEqual({
      kind: 'array',
      elem: { kind: 'array', elem: { kind: 'uint', bits: 256 }, length: null },
      length: null,
    })
  })

  it('空类型抛错', () => {
    expect(() => parseType('  ')).toThrow('类型不能为空')
  })

  it('数组前缀为空抛错', () => {
    expect(() => parseType('[]')).toThrow('类型格式错误')
  })

  it('数组长度非法抛错', () => {
    expect(() => parseType('uint256[-1]')).toThrow('不支持的类型')
  })

  it('uint 位宽非法抛错', () => {
    expect(() => parseType('uint7')).toThrow('8–256')
    expect(() => parseType('uint12')).toThrow('8 的倍数')
    expect(() => parseType('uint300')).toThrow('8–256')
  })

  it('bytes<M> 越界抛错', () => {
    expect(() => parseType('bytes0')).toThrow('1–32')
    expect(() => parseType('bytes33')).toThrow('1–32')
  })

  it('未知类型抛错', () => {
    expect(() => parseType('tuple')).toThrow('不支持的类型')
    expect(() => parseType('fixed128x18')).toThrow('不支持的类型')
  })
})

describe('isDynamicType / canonicalType', () => {
  it('静态类型', () => {
    expect(isDynamicType(parseType('uint256'))).toBe(false)
    expect(isDynamicType(parseType('address[2]'))).toBe(false)
  })

  it('动态类型', () => {
    expect(isDynamicType(parseType('bytes'))).toBe(true)
    expect(isDynamicType(parseType('string'))).toBe(true)
    expect(isDynamicType(parseType('uint256[]'))).toBe(true)
    expect(isDynamicType(parseType('string[2]'))).toBe(true)
  })

  it('规范形式', () => {
    expect(canonicalType(parseType('uint'))).toBe('uint256')
    expect(canonicalType(parseType('int'))).toBe('int256')
    expect(canonicalType(parseType('address'))).toBe('address')
    expect(canonicalType(parseType('bool'))).toBe('bool')
    expect(canonicalType(parseType('bytes32'))).toBe('bytes32')
    expect(canonicalType(parseType('bytes'))).toBe('bytes')
    expect(canonicalType(parseType('string'))).toBe('string')
    expect(canonicalType(parseType('uint8[3]'))).toBe('uint8[3]')
    expect(canonicalType(parseType('bytes[]'))).toBe('bytes[]')
  })
})

describe('parseSignature / functionSelector', () => {
  it('解析 transfer', () => {
    expect(parseSignature('transfer(address,uint256)')).toEqual({
      name: 'transfer',
      types: [{ kind: 'address' }, { kind: 'uint', bits: 256 }],
    })
  })

  it('无参数函数', () => {
    expect(parseSignature('totalSupply()')).toEqual({ name: 'totalSupply', types: [] })
  })

  it('格式错误抛错', () => {
    expect(() => parseSignature('transfer')).toThrow('签名格式错误')
    expect(() => parseSignature('1abc(uint256)')).toThrow('签名格式错误')
  })

  it('transfer 选择器为公认值 a9059cbb', () => {
    expect(functionSelector('transfer(address,uint256)')).toBe('0xa9059cbb')
  })

  it('uint 简写与 uint256 选择器一致', () => {
    expect(functionSelector('foo(uint)')).toBe(functionSelector('foo(uint256)'))
  })

  it('balanceOf 选择器', () => {
    expect(functionSelector('balanceOf(address)')).toBe('0x70a08231')
  })
})

describe('abiEncode 静态类型', () => {
  const st = (t: string) => parseType(t) as StaticAbiType

  it('uint256', () => {
    expect(bytesToHex(encodeStatic(st('uint256'), '1000')).slice(-4)).toBe('03e8')
    expect(bytesToHex(encodeStatic(st('uint256'), '0x3e8')).slice(-4)).toBe('03e8')
  })

  it('uint8 越界抛错', () => {
    expect(() => encodeStatic(st('uint8'), '256')).toThrow('越界')
    expect(() => encodeStatic(st('uint8'), '-1')).toThrow('越界')
    expect(() => encodeStatic(st('uint8'), 'abc')).toThrow('参数非法')
  })

  it('int8 负数补码', () => {
    expect(bytesToHex(encodeStatic(st('int8'), '-5'))).toBe(
      'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb',
    )
  })

  it('int 越界抛错', () => {
    expect(() => encodeStatic(st('int8'), '128')).toThrow('越界')
    expect(() => encodeStatic(st('int8'), '-129')).toThrow('越界')
    expect(() => encodeStatic(st('int8'), 'zz')).toThrow('参数非法')
  })

  it('int8 0x 位模式', () => {
    expect(bytesToHex(encodeStatic(st('int8'), '0xfb')).slice(-2)).toBe('fb')
    expect(() => encodeStatic(st('int8'), '0x1ff')).toThrow('越界')
    expect(() => encodeStatic(st('int8'), '0xzz')).toThrow('参数非法')
  })

  it('address 左补零', () => {
    const enc = bytesToHex(encodeStatic(st('address'), ADDRESS))
    expect(enc).toBe(`000000000000000000000000${ADDRESS_LOWER.slice(2)}`)
  })

  it('address 非法抛错', () => {
    expect(() => encodeStatic(st('address'), '0x1234')).toThrow('40 位 hex')
  })

  it('bool', () => {
    expect(bytesToHex(encodeStatic(st('bool'), 'true')).slice(-1)).toBe('1')
    expect(bytesToHex(encodeStatic(st('bool'), 'FALSE')).slice(-1)).toBe('0')
    expect(() => encodeStatic(st('bool'), 'yes')).toThrow('bool 参数非法')
  })

  it('bytes3 右补零', () => {
    expect(bytesToHex(encodeStatic(st('bytes3'), '0xaabbcc'))).toBe(`aabbcc${'00'.repeat(29)}`)
    expect(() => encodeStatic(st('bytes3'), '0xaabb')).toThrow('3 字节')
  })
})

describe('abiEncode 动态类型（eth-abi 向量）', () => {
  it('string[] = ["hello","world"]', () => {
    const got = abiEncode([parseType('string[]')], ['["hello","world"]'])
    expect(got).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
        '0000000000000000000000000000000000000000000000000000000000000002' +
        '0000000000000000000000000000000000000000000000000000000000000040' +
        '0000000000000000000000000000000000000000000000000000000000000080' +
        '0000000000000000000000000000000000000000000000000000000000000005' +
        '68656c6c6f000000000000000000000000000000000000000000000000000000' +
        '0000000000000000000000000000000000000000000000000000000000000005' +
        '776f726c64000000000000000000000000000000000000000000000000000000',
    )
  })

  it('uint256[][] = [[1],[2,3]]', () => {
    const got = abiEncode([parseType('uint256[][]')], ['[["1"],["2","3"]]'])
    expect(got).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
        '0000000000000000000000000000000000000000000000000000000000000002' +
        '0000000000000000000000000000000000000000000000000000000000000040' +
        '0000000000000000000000000000000000000000000000000000000000000080' +
        '0000000000000000000000000000000000000000000000000000000000000001' +
        '0000000000000000000000000000000000000000000000000000000000000001' +
        '0000000000000000000000000000000000000000000000000000000000000002' +
        '0000000000000000000000000000000000000000000000000000000000000002' +
        '0000000000000000000000000000000000000000000000000000000000000003',
    )
  })

  it('string + uint256 混合', () => {
    const got = abiEncode([parseType('string'), parseType('uint256')], ['hello', '1000'])
    expect(got).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000040' +
        '00000000000000000000000000000000000000000000000000000000000003e8' +
        '0000000000000000000000000000000000000000000000000000000000000005' +
        '68656c6c6f000000000000000000000000000000000000000000000000000000',
    )
  })

  it('bytes 动态', () => {
    const got = abiEncode([parseType('bytes')], ['0xdeadbeef'])
    expect(got).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
        '0000000000000000000000000000000000000000000000000000000000000004' +
        'deadbeef00000000000000000000000000000000000000000000000000000000',
    )
  })

  it('定长数组 address[2]', () => {
    const got = abiEncode(
      [parseType('address[2]')],
      [`["${ADDRESS}","${ADDRESS_LOWER}"]`],
    )
    expect(got.slice(0, 66)).toBe(`0x${'0'.repeat(24)}${ADDRESS_LOWER.slice(2)}`)
    expect(got).toHaveLength(2 + 128)
  })

  it('嵌套定长数组 uint8[2][3] 内联拼接', () => {
    const enc = abiEncode([parseType('uint8[2][3]')], ['[["1","2"],["3","4"],["5","6"]]'])
    expect(enc).toHaveLength(2 + 32 * 6 * 2)
    expect(abiDecode([parseType('uint8[2][3]')], enc)).toEqual(['[["1","2"],["3","4"],["5","6"]]'])
  })

  it('静态数组与动态参数混排时偏移正确', () => {
    const types = [parseType('address[2]'), parseType('string')]
    const enc = abiEncode(types, [`["${ADDRESS}","${ADDRESS}"]`, 'hi'])
    // 头部：2 个地址字 + 1 个偏移字；偏移应为 96 (0x60)
    expect(enc.slice(2 + 64 * 2, 2 + 64 * 2 + 64).slice(-2)).toBe('60')
    expect(abiDecode(types, enc)).toEqual([`["${ADDRESS}","${ADDRESS}"]`, 'hi'])
  })

  it('定长数组元素数量不符抛错', () => {
    const t = parseType('address[2]') as DynamicAbiType
    expect(() => encodeDynamic(t, '["0x1234"]')).toThrow('元素数量不符')
  })

  it('静态定长数组元素数量不符抛错', () => {
    expect(() => abiEncode([parseType('address[2]')], ['["0x1234"]'])).toThrow('元素数量不符')
  })

  it('类型与参数数量不一致抛错', () => {
    expect(() => abiEncode([parseType('uint256')], [])).toThrow('数量不一致')
  })

  it('parseJsonArray 非法抛错', () => {
    expect(() => parseJsonArray('not json')).toThrow('JSON 数组')
    expect(() => parseJsonArray('{"a":1}')).toThrow('JSON 数组')
    expect(() => parseJsonArray('[{}]')).toThrow('数组元素须为')
  })

  it('parseJsonArray 元素归一化', () => {
    expect(parseJsonArray('[1, true, "x", ["a"]]')).toEqual(['1', 'true', 'x', '["a"]'])
  })
})

describe('encodeFunctionCall / decodeFunctionCall', () => {
  const CALLDATA =
    '0xa9059cbb0000000000000000000000005aaeb6053f3e94c9b9a09f33669435e7ef1beaed' +
    '00000000000000000000000000000000000000000000000000000000000003e8'

  it('transfer 编码', () => {
    expect(encodeFunctionCall('transfer(address,uint256)', [ADDRESS, '1000'])).toBe(CALLDATA)
  })

  it('transfer 解码', () => {
    const { name, selector, values } = decodeFunctionCall('transfer(address,uint256)', CALLDATA)
    expect(name).toBe('transfer')
    expect(selector).toBe('0xa9059cbb')
    expect(values).toEqual([ADDRESS, '1000'])
  })

  it('选择器不匹配抛错', () => {
    expect(() => decodeFunctionCall('approve(address,uint256)', CALLDATA)).toThrow('选择器不匹配')
  })

  it('calldata 过短抛错', () => {
    expect(() => decodeFunctionCall('transfer(address,uint256)', '0x1234')).toThrow('过短')
  })

  it('参数区过短 / 非 32 倍数抛错', () => {
    expect(() => decodeFunctionCall('transfer(address,uint256)', '0xa9059cbb1234')).toThrow(
      '参数区过短',
    )
    expect(() =>
      decodeFunctionCall('transfer(address,uint256)', `0xa9059cbb${'00'.repeat(65)}`),
    ).toThrow('32 字节的倍数')
  })

  it('string 参数编解码往返', () => {
    const enc = encodeFunctionCall('setName(string)', ['你好 web3'])
    const { values } = decodeFunctionCall('setName(string)', enc)
    expect(values).toEqual(['你好 web3'])
  })
})

describe('abiDecode', () => {
  it('bool/bytes3/int8 解码（eth-abi 向量）', () => {
    const data =
      '0x0000000000000000000000000000000000000000000000000000000000000001' +
      'aabbcc0000000000000000000000000000000000000000000000000000000000' +
      'fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffb'
    expect(abiDecode([parseType('bool'), parseType('bytes3'), parseType('int8')], data)).toEqual([
      'true',
      '0xaabbcc',
      '-5',
    ])
  })

  it('bool 非法值抛错', () => {
    const data = `0x${'00'.repeat(31)}02`
    expect(() => abiDecode([parseType('bool')], data)).toThrow('bool 解码值非法')
  })

  it('int 正数与 bool false 解码', () => {
    const data = `0x${'00'.repeat(31)}05${'00'.repeat(32)}`
    expect(abiDecode([parseType('int8'), parseType('bool')], data)).toEqual(['5', 'false'])
  })

  it('动态数组长度超大抛错', () => {
    const data = `0x${'00'.repeat(31)}20${'ff'.repeat(32)}`
    expect(() => abiDecode([parseType('uint256[]')], data)).toThrow('数组长度超出安全范围')
  })

  it('uint256[][] 解码（eth-abi 向量）', () => {
    const data =
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000002' +
      '0000000000000000000000000000000000000000000000000000000000000040' +
      '0000000000000000000000000000000000000000000000000000000000000080' +
      '0000000000000000000000000000000000000000000000000000000000000001' +
      '0000000000000000000000000000000000000000000000000000000000000001' +
      '0000000000000000000000000000000000000000000000000000000000000002' +
      '0000000000000000000000000000000000000000000000000000000000000002' +
      '0000000000000000000000000000000000000000000000000000000000000003'
    expect(abiDecode([parseType('uint256[][]')], data)).toEqual(['[["1"],["2","3"]]'])
  })

  it('bytes 动态解码', () => {
    const data =
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000004' +
      'deadbeef00000000000000000000000000000000000000000000000000000000'
    expect(abiDecode([parseType('bytes')], data)).toEqual(['0xdeadbeef'])
  })

  it('calldata 过短 / 非 32 倍数抛错', () => {
    expect(() => abiDecode([parseType('uint256'), parseType('uint256')], '0x1234')).toThrow(
      '过短',
    )
    expect(() => abiDecode([parseType('uint256')], `0x${'00'.repeat(33)}`)).toThrow('32 字节的倍数')
  })

  it('动态偏移超出安全范围抛错', () => {
    const data = `0x${'ff'.repeat(32)}`
    expect(() => abiDecode([parseType('string')], data)).toThrow('偏移量超出安全范围')
  })

  it('动态偏移指向越界抛错', () => {
    // offset = 0x40，但数据仅 32 字节
    const data = `0x${'00'.repeat(31)}40`
    expect(() => abiDecode([parseType('string')], data)).toThrow('动态偏移')
  })

  it('静态数组头部读取越界抛错', () => {
    // address[2] 需 64 字节头部，只给 32 字节
    const data = `0x${'00'.repeat(32)}`
    expect(() => abiDecode([parseType('address[2]')], data)).toThrow('calldata 越界')
  })

  it('动态数据长度超大抛错', () => {
    // offset=0x20 → 长度字为 2^256−1
    const data =
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    expect(() => abiDecode([parseType('bytes')], data)).toThrow('超出安全范围')
  })

  it('定长动态元素数组 string[2] 解码', () => {
    const enc = abiEncode([parseType('string[2]')], ['["a","b"]'])
    expect(abiDecode([parseType('string[2]')], enc)).toEqual(['["a","b"]'])
  })

  it('动态数据长度越界抛错', () => {
    // offset=0x20 指向长度字 = 0x100（超长）
    const data =
      '0x0000000000000000000000000000000000000000000000000000000000000020' +
      '0000000000000000000000000000000000000000000000000000000000000100'
    expect(() => abiDecode([parseType('string')], data)).toThrow('越界')
  })
})

describe('基础工具', () => {
  it('wordFromBigint 越界抛错', () => {
    expect(() => wordFromBigint(-1n)).toThrow('32 字节字范围')
    expect(() => wordFromBigint(1n << 256n)).toThrow('32 字节字范围')
  })

  it('wordToBigint 往返', () => {
    const w = wordFromBigint(123456789n)
    expect(wordToBigint(w)).toBe(123456789n)
  })

  it('concatBytes', () => {
    expect(bytesToHex(concatBytes([new Uint8Array([1]), new Uint8Array([2, 3])]))).toBe('010203')
  })

  it('hexToBytes 非法抛错', () => {
    expect(() => hexToBytes('0xabc')).toThrow('hex 格式错误')
    expect(() => hexToBytes('zz')).toThrow('hex 格式错误')
  })

  it('keccak256 输出 32 字节 / toChecksumAddress', () => {
    expect(keccak256(new Uint8Array([1]))).toHaveLength(32)
    expect(toChecksumAddress(ADDRESS_LOWER)).toBe(ADDRESS)
  })
})
