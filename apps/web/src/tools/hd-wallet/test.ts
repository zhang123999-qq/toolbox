/**
 * hd-wallet（#703）utils 单测：
 * BIP32 官方测试向量（主密钥）＋ 独立 Python 实现交叉验证的派生向量；
 * hmac 注入 mock 覆盖防御分支。
 */
import { createHmac, pbkdf2Sync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  deriveAddressRange,
  deriveChildKey,
  derivePath,
  hexToBytes,
  hmacSha512,
  isOnCurve,
  masterKeyFromSeed,
  modInv,
  parsePath,
  parsePrivateKeyHex,
  parseSeedHex,
  pbkdf2HmacSha512,
  pointAdd,
  pointDouble,
  pointMul,
  privateKeyToAddress,
  privateToPublic,
  publicToAddress,
  seedToAddress,
  SECP256K1_GX,
  SECP256K1_GY,
  SECP256K1_N,
  SECP256K1_P,
  toChecksumAddress,
  type HDKey,
  type HmacSha512Fn,
} from './utils'

const hexOf = (b: Uint8Array) => bytesToHex(b)

/** BIP32 官方测试向量 1：seed 000102030405060708090a0b0c0d0e0f → chain m */
const V1_SEED = '000102030405060708090a0b0c0d0e0f'
const V1_PRIV = 'e8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35'
const V1_CHAIN = '873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508'

/** 独立 Python 实现（hashlib + ecdsa 库）交叉验证的派生向量 */
const V2_SEED = V1_SEED
const V2_PATH = "m/44'/60'/0'/0/0"
const V2_PRIV = 'e22f5526ce620ec69441c3453d7a0acbc26c3fc7543023f338123fd45c7d44b3'
const V2_ADDR = '0x022b971dFF0C43305e691DEd7a14367AF19D6407'
const V3_SEED = 'fffcf9f6f3f0edeae7e4e1dedbd8d5aa4f9f8c2e4e6a6b2c1b2e2a2a2a2a2a2a'
const V3_PATH = "m/44'/60'/0'/0/5"
const V3_PRIV = 'e958121b8c7337936b242ee12adba27a64117760ff5202c5b7e0d16a31ef5b41'
const V3_ADDR = '0xAe0815be4acfe0EF298cdB42708d793daF4f8B63'

function masterOf(seedHex: string): HDKey {
  return masterKeyFromSeed(parseSeedHex(seedHex))
}

describe('parseSeedHex', () => {
  it('合法种子', () => {
    expect(parseSeedHex(V1_SEED)).toHaveLength(16)
    expect(parseSeedHex('0x' + V1_SEED)).toHaveLength(16)
  })
  it('非法 hex 抛错', () => {
    expect(() => parseSeedHex('zzzz')).toThrow('种子格式错误')
    expect(() => parseSeedHex('abc')).toThrow('种子格式错误')
  })
  it('长度越界抛错', () => {
    expect(() => parseSeedHex('00'.repeat(8))).toThrow('种子长度错误')
    expect(() => parseSeedHex('00'.repeat(65))).toThrow('种子长度错误')
  })
})

describe('masterKeyFromSeed', () => {
  it('BIP32 官方向量 1（chain m）', () => {
    const m = masterOf(V1_SEED)
    expect(hexOf(m.priv)).toBe(V1_PRIV)
    expect(hexOf(m.chainCode)).toBe(V1_CHAIN)
  })
  it('mock hmac 返回全零 → 主密钥无效', () => {
    const zeroHmac: HmacSha512Fn = () => new Uint8Array(64)
    expect(() => masterKeyFromSeed(parseSeedHex(V1_SEED), zeroHmac)).toThrow('主密钥无效')
  })
})

describe('parsePath', () => {
  it('解析硬化/非硬化', () => {
    expect(parsePath("m/44'/60'/0'/0/0")).toEqual([
      44 + 0x80000000,
      60 + 0x80000000,
      0 + 0x80000000,
      0,
      0,
    ])
    expect(parsePath('m')).toEqual([])
  })
  it('格式错误抛错', () => {
    expect(() => parsePath('n/44')).toThrow('路径格式错误')
    expect(() => parsePath("m/44''")).toThrow('路径格式错误')
    expect(() => parsePath('m/2147483648')).toThrow('路径序号错误')
  })
})

describe('derivePath / deriveChildKey', () => {
  it('BIP44 ETH 首地址（Python 独立实现交叉验证）', () => {
    const child = derivePath(masterOf(V2_SEED), V2_PATH)
    expect(hexOf(child.priv)).toBe(V2_PRIV)
  })
  it('非硬化序号 5（Python 独立实现交叉验证）', () => {
    const child = derivePath(masterOf(V3_SEED), V3_PATH)
    expect(hexOf(child.priv)).toBe(V3_PRIV)
  })
  it('路径 m 返回主密钥本身', () => {
    const master = masterOf(V1_SEED)
    expect(hexOf(derivePath(master, 'm').priv)).toBe(V1_PRIV)
  })
  it('非法序号抛错', () => {
    const master = masterOf(V1_SEED)
    expect(() => deriveChildKey(master, -1)).toThrow('推导序号错误')
    expect(() => deriveChildKey(master, 0xffffffff + 1)).toThrow('推导序号错误')
    expect(() => deriveChildKey(master, 1.5)).toThrow('推导序号错误')
  })
  it('mock hmac：IL ≥ n 抛错', () => {
    const master = masterOf(V1_SEED)
    const badIl: HmacSha512Fn = () => {
      const out = new Uint8Array(64)
      out.set(hexToBytes(SECP256K1_N.toString(16).padStart(64, '0')), 0)
      return out
    }
    expect(() => deriveChildKey(master, 0x80000000, badIl)).toThrow('IL 超出曲线阶')
  })
  it('mock hmac：子密钥为 0 抛错', () => {
    const master = masterOf(V1_SEED)
    const parentK = BigInt(`0x${hexOf(master.priv)}`)
    const il = SECP256K1_N - parentK // il + parent ≡ 0 (mod n)
    const zeroChild: HmacSha512Fn = () => {
      const out = new Uint8Array(64)
      out.set(hexToBytes(il.toString(16).padStart(64, '0')), 0)
      return out
    }
    expect(() => deriveChildKey(master, 0, zeroChild)).toThrow('子密钥为 0')
  })
})

describe('privateKeyToAddress', () => {
  it('私钥 1 → 经典地址', () => {
    const priv = hexToBytes('00'.repeat(31) + '01')
    expect(privateKeyToAddress(priv)).toBe('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
  })
  it('派生私钥 → 地址（Python 交叉验证）', () => {
    expect(privateKeyToAddress(hexToBytes(V2_PRIV))).toBe(V2_ADDR)
    expect(privateKeyToAddress(hexToBytes(V3_PRIV))).toBe(V3_ADDR)
  })
  it('非法私钥抛错', () => {
    expect(() => privateKeyToAddress(new Uint8Array(32))).toThrow('私钥数值无效')
  })
})

describe('seedToAddress', () => {
  it('一站式', () => {
    expect(seedToAddress(V2_SEED, V2_PATH)).toBe(V2_ADDR)
  })
})

describe('deriveAddressRange', () => {
  it('批量 0–2：路径/地址连续', () => {
    const list = deriveAddressRange(V2_SEED, "m/44'/60'/0'/0", 0, 2)
    expect(list).toHaveLength(3)
    expect(list[0].path).toBe("m/44'/60'/0'/0/0")
    expect(list[0].address).toBe(V2_ADDR)
    expect(list[2].index).toBe(2)
    for (const e of list) {
      expect(e.privHex).toMatch(/^[0-9a-f]{64}$/)
      expect(e.address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    }
  })
  it('basePath 尾部斜杠容忍', () => {
    const list = deriveAddressRange(V2_SEED, "m/44'/60'/0'/0/", 0, 0)
    expect(list[0].path).toBe("m/44'/60'/0'/0/0")
  })
  it('非法参数抛错', () => {
    expect(() => deriveAddressRange(V2_SEED, "m/44'/60'/0'/0", -1, 2)).toThrow('非负整数')
    expect(() => deriveAddressRange(V2_SEED, "m/44'/60'/0'/0", 3, 2)).toThrow(
      '起始序号不能大于结束序号',
    )
    expect(() => deriveAddressRange(V2_SEED, "m/44'/60'/0'/0", 0, 20)).toThrow('最多 20 个')
    expect(() => deriveAddressRange(V2_SEED, 'bad', 0, 2)).toThrow('路径格式错误')
  })
})

describe('hmacSha512（手写）', () => {
  const te = new TextEncoder()
  it('与 Node crypto 一致（含空 key / 空消息）', () => {
    const cases: Array<[string, string]> = [
      ['key', 'The quick brown fox jumps over the lazy dog'],
      ['', ''],
      ['short', ''],
    ]
    for (const [k, m] of cases) {
      expect(hexOf(hmacSha512(te.encode(k), te.encode(m)))).toBe(
        createHmac('sha512', k).update(m).digest('hex'),
      )
    }
  })
  it('超长 key（>128 字节）先哈希', () => {
    const k = 'k'.repeat(200)
    const te2 = new TextEncoder()
    expect(hexOf(hmacSha512(te2.encode(k), te2.encode('msg')))).toBe(
      createHmac('sha512', k).update('msg').digest('hex'),
    )
  })
})

describe('pbkdf2HmacSha512（手写）', () => {
  const te = new TextEncoder()
  it('与 Node crypto 一致', () => {
    for (const [iters, dkLen] of [
      [1, 64],
      [2, 64],
      [100, 32],
    ] as Array<[number, number]>) {
      expect(hexOf(pbkdf2HmacSha512(te.encode('password'), te.encode('salt'), iters, dkLen))).toBe(
        pbkdf2Sync('password', 'salt', iters, dkLen, 'sha512').toString('hex'),
      )
    }
  })
  it('多块派生（dkLen > 64）', () => {
    const dk = pbkdf2HmacSha512(te.encode('password'), te.encode('salt'), 1, 100)
    expect(dk.length).toBe(100)
    expect(hexOf(dk)).toBe(pbkdf2Sync('password', 'salt', 1, 100, 'sha512').toString('hex'))
  })
  it('非法参数抛错', () => {
    const p = te.encode('p')
    const s = te.encode('s')
    expect(() => pbkdf2HmacSha512(p, s, 0, 32)).toThrow('迭代次数')
    expect(() => pbkdf2HmacSha512(p, s, 1.5, 32)).toThrow('迭代次数')
    expect(() => pbkdf2HmacSha512(p, s, 1, 0)).toThrow('派生长度')
  })
})

describe('底层椭圆曲线 helpers（分支补齐）', () => {
  const G = { x: SECP256K1_GX, y: SECP256K1_GY }
  const negG = { x: SECP256K1_GX, y: SECP256K1_P - SECP256K1_GY }

  it('modInv：可逆与不可逆', () => {
    expect(modInv(3n, 11n)).toBe(4n)
    expect(() => modInv(2n, 4n)).toThrow('模逆元不存在')
  })
  it('isOnCurve：真与假', () => {
    expect(isOnCurve(G)).toBe(true)
    expect(isOnCurve({ x: 1n, y: 1n })).toBe(false)
  })
  it('pointAdd：无穷远点 / 取反 / 加倍', () => {
    expect(pointAdd(null, G)).toEqual(G)
    expect(pointAdd(G, null)).toEqual(G)
    expect(pointAdd(G, negG)).toBeNull()
    expect(pointAdd(G, G)).toEqual(pointDouble(G))
  })
  it('pointMul：非法标量抛错', () => {
    expect(() => pointMul(0n)).toThrow('标量')
    expect(() => pointMul(SECP256K1_N)).toThrow('标量')
  })
  it('parsePrivateKeyHex：格式 / 范围错误', () => {
    expect(() => parsePrivateKeyHex('0x1234')).toThrow('私钥格式错误')
    expect(() => parsePrivateKeyHex('00'.repeat(32))).toThrow('私钥数值无效')
    expect(() => parsePrivateKeyHex(SECP256K1_N.toString(16).padStart(64, '0'))).toThrow(
      '私钥数值无效',
    )
    expect(parsePrivateKeyHex(`0X${'00'.repeat(31)}01`)).toBe(1n)
  })
  it('压缩公钥 02/03 两种前缀', () => {
    const prefixes = new Set(
      [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n].map((k) =>
        privateToPublic(k.toString(16).padStart(64, '0')).compressed.slice(0, 2),
      ),
    )
    expect(prefixes.has('02')).toBe(true)
    expect(prefixes.has('03')).toBe(true)
  })
  it('hexToBytes：奇数位 / 非法字符抛错', () => {
    expect(() => hexToBytes('abc')).toThrow('hex 格式错误')
    expect(() => hexToBytes('zz')).toThrow('hex 格式错误')
  })
  it('toChecksumAddress：不带 0x 前缀', () => {
    expect(toChecksumAddress('7e5f4552091a69125d5dfcb7b8c2659029395bdf')).toBe(
      '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
    )
  })
  it('publicToAddress：格式错误抛错', () => {
    expect(() => publicToAddress('0x1234')).toThrow('公钥格式错误')
  })
})

describe('publicToAddress 成功路径（分支补齐）', () => {
  it('由私钥推导地址与独立向量一致', () => {
    const pub = privateToPublic(`${'00'.repeat(31)}01`)
    const addr = publicToAddress(pub.uncompressed)
    expect(addr).toBe('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
  })
  it('publicToAddress 非 04 开头抛错', () => {
    expect(() => publicToAddress(`0x05${'00'.repeat(64)}`)).toThrow('须以 04 开头')
  })
  it('toChecksumAddress 大写 0X 前缀', () => {
    expect(toChecksumAddress('0X7e5f4552091a69125d5dfcb7b8c2659029395bdf')).toBe(
      '0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf',
    )
  })
})
