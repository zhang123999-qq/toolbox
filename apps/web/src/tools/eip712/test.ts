/**
 * eip712（#705）utils 单测：encodeType / typeHash / encodeData / structHash / hashTypedData。
 * Ether Mail 为 EIP-712 官方示例向量。
 */
import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  encodeData,
  encodeType,
  hashTypedData,
  hexToBytes,
  keccak256,
  structHash,
  typeHash,
  type EIP712Types,
  type EIP712Value,
  type TypedDataInput,
} from './utils'

const hexOf = (b: Uint8Array) => bytesToHex(b)

/** EIP-712 官方 Ether Mail 示例 */
const MAIL_TYPES: EIP712Types = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
  ],
  Person: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' },
  ],
  Mail: [
    { name: 'from', type: 'Person' },
    { name: 'to', type: 'Person' },
    { name: 'contents', type: 'string' },
  ],
}

const MAIL_INPUT: TypedDataInput = {
  types: MAIL_TYPES,
  domain: {
    name: 'Ether Mail',
    version: '1',
    chainId: 1,
    verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
  },
  primaryType: 'Mail',
  message: {
    from: { name: 'Cow', wallet: '0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826' },
    to: { name: 'Bob', wallet: '0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB' },
    contents: 'Hello, Bob!',
  },
}

describe('keccak256（手写）', () => {
  it('空串等于 Keccak-256 已知值', () => {
    // 注意：Node 的 sha3-256 是 NIST 填充，与 Keccak 不同，不可直接对比
    expect(hexOf(keccak256(new Uint8Array(0)))).toBe(
      'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    )
  })
  it('长输入跨多块', () => {
    const data = new Uint8Array(300).fill(0x61)
    expect(hexOf(keccak256(data))).toHaveLength(64)
  })
})

describe('hexToBytes / bytesToHex', () => {
  it('往返', () => {
    expect(hexOf(hexToBytes('0x00ff10'))).toBe('00ff10')
    expect(hexOf(hexToBytes('00ff10'))).toBe('00ff10')
  })
  it('非法抛错', () => {
    expect(() => hexToBytes('0x123')).toThrow('十六进制格式错误')
    expect(() => hexToBytes('0xzz')).toThrow('十六进制格式错误')
  })
})

describe('encodeType', () => {
  it('Ether Mail 官方 encodeType', () => {
    expect(encodeType('Mail', MAIL_TYPES)).toBe(
      'Mail(Person from,Person to,string contents)Person(string name,address wallet)',
    )
  })
  it('依赖按字母序排列', () => {
    const types: EIP712Types = {
      Z: [{ name: 'a', type: 'A' }],
      A: [{ name: 'x', type: 'uint256' }],
      M: [{ name: 'z', type: 'Z' }],
    }
    expect(encodeType('M', types)).toBe('M(Z z)A(uint256 x)Z(A a)')
  })
  it('未知主类型抛错', () => {
    expect(() => encodeType('Nope', MAIL_TYPES)).toThrow('未知类型 Nope')
  })
  it('未知字段类型抛错', () => {
    const bad: EIP712Types = { T: [{ name: 'x', type: 'float' }] }
    expect(() => encodeType('T', bad)).toThrow('非法类型 float')
  })
  it('非法位宽抛错', () => {
    const bad: EIP712Types = { T: [{ name: 'x', type: 'uint7' }] }
    expect(() => encodeType('T', bad)).toThrow('位宽')
    const bad2: EIP712Types = { T: [{ name: 'x', type: 'bytes33' }] }
    expect(() => encodeType('T', bad2)).toThrow('bytesN')
  })
})

describe('hashTypedData（Ether Mail 官方向量）', () => {
  it('domainSeparator 一致', () => {
    const res = hashTypedData(MAIL_INPUT)
    expect(res.domainSeparatorHex).toBe(
      'f2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f',
    )
  })
  it('最终 digest 一致', () => {
    const res = hashTypedData(MAIL_INPUT)
    expect(res.digestHex).toBe('be609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2')
  })
  it('encodedType 与 typeHash 自洽', () => {
    const res = hashTypedData(MAIL_INPUT)
    expect(res.encodedType).toBe(
      'Mail(Person from,Person to,string contents)Person(string name,address wallet)',
    )
    expect(res.typeHashHex).toBe(hexOf(typeHash('Mail', MAIL_TYPES)))
    expect(res.messageHashHex).toBe(
      hexOf(structHash('Mail', MAIL_INPUT.message as { [k: string]: EIP712Value }, MAIL_TYPES)),
    )
  })
  it('缺少 EIP712Domain 声明抛错', () => {
    const { EIP712Domain: _d, ...rest } = MAIL_TYPES
    void _d
    expect(() => hashTypedData({ ...MAIL_INPUT, types: rest })).toThrow('EIP712Domain')
  })
  it('缺少字段抛错', () => {
    const bad = {
      ...MAIL_INPUT,
      message: { ...MAIL_INPUT.message, contents: undefined as never },
    }
    delete (bad.message as Record<string, unknown>).contents
    expect(() => hashTypedData(bad)).toThrow('缺少字段 Mail.contents')
  })
})

describe('原子类型编码', () => {
  const T = (fields: EIP712Types[string]) => ({ Wrap: fields })
  const enc = (type: string, value: EIP712Value) =>
    hexOf(encodeData('Wrap', { v: value }, T([{ name: 'v', type }]))).slice(64)

  it('address 左补零', () => {
    expect(enc('address', '0x0000000000000000000000000000000000000001')).toBe(
      '0000000000000000000000000000000000000000000000000000000000000001',
    )
    expect(() => enc('address', '0x123')).toThrow('地址')
  })
  it('uint / int 范围', () => {
    expect(enc('uint', 1)).toBe('00'.repeat(31) + '01')
    expect(enc('int', -1)).toBe('ff'.repeat(32))
    expect(enc('uint8', 255)).toBe('00'.repeat(31) + 'ff')
    expect(enc('uint256', '123456789012345678901234567890')).toHaveLength(64)
    expect(enc('uint256', 42n)).toBe('00'.repeat(31) + '2a')
    expect(() => enc('uint8', 256)).toThrow('超出 uint8 范围')
    expect(() => enc('uint8', -1)).toThrow('超出 uint8 范围')
    expect(() => enc('uint8', 1.5)).toThrow('须为整数')
    expect(() => enc('uint8', 'abc')).toThrow('整数')
    expect(() => enc('uint8', true)).toThrow('整数')
    expect(enc('int8', -1)).toBe('ff'.repeat(32))
    expect(enc('int8', 127)).toBe('00'.repeat(31) + '7f')
    expect(() => enc('int8', 128)).toThrow('超出 int8 范围')
    expect(() => enc('int8', -129)).toThrow('超出 int8 范围')
  })
  it('bool', () => {
    expect(enc('bool', true)).toBe('00'.repeat(31) + '01')
    expect(enc('bool', false)).toBe('00'.repeat(32))
    expect(() => enc('bool', 'true')).toThrow('布尔值')
  })
  it('bytesN 右补零', () => {
    expect(enc('bytes4', '0xdeadbeef')).toBe('deadbeef' + '00'.repeat(28))
    expect(enc('bytes2', new Uint8Array([1, 2]))).toBe('0102' + '00'.repeat(30))
    expect(() => enc('bytes4', '0xdead')).toThrow('4 字节')
    expect(() => enc('bytes4', 123)).toThrow('4 字节')
  })
  it('bytes / string 取 keccak', () => {
    // bytes 取 keccak256（与手写实现自洽，官方向量已在 hashTypedData 验证）
    expect(enc('bytes', '0x0102')).toBe(hexOf(keccak256(new Uint8Array([1, 2]))))
    expect(enc('bytes', new Uint8Array([1, 2]))).toBe(hexOf(keccak256(new Uint8Array([1, 2]))))
    expect(() => enc('bytes', 7)).toThrow('hex 字符串')
    expect(enc('string', 'hello')).toBe(hexOf(keccak256(new TextEncoder().encode('hello'))))
    expect(() => enc('string', 7)).toThrow('字符串')
  })
})

describe('数组与嵌套', () => {
  it('动态数组与静态数组', () => {
    const types: EIP712Types = {
      T: [
        { name: 'dyn', type: 'uint256[]' },
        { name: 'fixed', type: 'address[2]' },
      ],
    }
    const data = {
      dyn: [1, 2, 3],
      fixed: [
        '0x0000000000000000000000000000000000000001',
        '0x0000000000000000000000000000000000000002',
      ],
    }
    const out = hexOf(encodeData('T', data, types))
    expect(out).toHaveLength(64 + 64 + 64)
    // 元素 keccak 可复算
    const elem = (n: number) => '00'.repeat(31) + n.toString(16).padStart(2, '0')
    const expectDyn = hexOf(
      keccak256(
        (() => {
          const parts: number[] = []
          for (const n of [1, 2, 3])
            for (const hx of [elem(n)])
              for (let i = 0; i < 32; i++) parts.push(parseInt(hx.slice(i * 2, i * 2 + 2), 16))
          return new Uint8Array(parts)
        })(),
      ),
    )
    expect(out.slice(64, 128)).toBe(expectDyn)
  })
  it('静态数组长度不匹配抛错', () => {
    const types: EIP712Types = { T: [{ name: 'a', type: 'uint8[2]' }] }
    expect(() => encodeData('T', { a: [1] }, types)).toThrow('数组长度须为 2')
  })
  it('非数组值抛错', () => {
    const types: EIP712Types = { T: [{ name: 'a', type: 'uint8[]' }] }
    expect(() => encodeData('T', { a: 5 }, types)).toThrow('须为数组')
  })
  it('struct 数组与嵌套数组类型校验', () => {
    const types: EIP712Types = {
      Person: [{ name: 'wallet', type: 'address' }],
      Group: [{ name: 'members', type: 'Person[]' }],
    }
    const data = {
      members: [{ wallet: '0x0000000000000000000000000000000000000001' }],
    }
    expect(hexOf(structHash('Group', data, types))).toHaveLength(64)
    // 菱形依赖：B/C 都依赖 D，collectDependencies 去重分支
    const diamond: EIP712Types = {
      D: [{ name: 'x', type: 'uint256' }],
      B: [{ name: 'd', type: 'D' }],
      C: [{ name: 'd', type: 'D' }],
      A: [
        { name: 'b', type: 'B' },
        { name: 'c', type: 'C' },
      ],
    }
    expect(encodeType('A', diamond)).toBe('A(B b,C c)B(D d)C(D d)D(uint256 x)')
  })
  it('encodeData 非对象抛错', () => {
    expect(() => encodeData('Mail', [1, 2] as never, MAIL_TYPES)).toThrow('须为对象')
  })
})

describe('位宽校验分支补齐', () => {
  it('uint512 / uint12 抛错（覆盖 bits>256 与非 8 倍数分支）', () => {
    expect(() => encodeType('T', { T: [{ name: 'x', type: 'uint512' }] })).toThrow('位宽')
    expect(() => encodeType('T', { T: [{ name: 'x', type: 'uint12' }] })).toThrow('位宽')
    expect(() => encodeType('T', { T: [{ name: 'x', type: 'int512' }] })).toThrow('位宽')
  })
  it('嵌套数组类型走 checkAtomicType 递归分支', () => {
    const types: EIP712Types = { T: [{ name: 'm', type: 'uint8[2][2]' }] }
    const data = {
      m: [
        [1, 2],
        [3, 4],
      ],
    }
    expect(hexOf(encodeData('T', data, types))).toHaveLength(128)
  })
})
