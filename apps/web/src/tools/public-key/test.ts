/**
 * public-key（#693）utils 单测：
 * secp256k1 点运算 / 私钥→公钥→地址。
 * 公钥与地址向量由 Python ecdsa + pycryptodome 独立生成（非本实现自举）。
 */
import { describe, expect, it } from 'vitest'
import {
  SECP256K1_GX,
  SECP256K1_GY,
  SECP256K1_N,
  SECP256K1_P,
  bytesToHex,
  hexToBytes,
  isOnCurve,
  keccak256,
  modInv,
  parsePrivateKeyHex,
  pointAdd,
  pointDouble,
  pointMul,
  privateKeyInfo,
  privateToPublic,
  publicToAddress,
  toChecksumAddress,
  type ECPoint,
} from './utils'

const G: ECPoint = { x: SECP256K1_GX, y: SECP256K1_GY }
const PRIV1 = '0x0000000000000000000000000000000000000000000000000000000000000001'
const PRIV2 = '0x0000000000000000000000000000000000000000000000000000000000000002'
const PRIV3 = '0x0000000000000000000000000000000000000000000000000000000000000003'
const PRIV_R = '84c3ce0964e95ac15f5597ef982fa84294aa6e10cab2720d43024c6e5c9dd308'

describe('modInv', () => {
  it('基本逆元：3⁻¹ mod 11 = 4', () => {
    expect(modInv(3n, 11n)).toBe(4n)
  })

  it('大数逆元自洽：a·a⁻¹ ≡ 1', () => {
    const a = 123456789012345678901234567890n
    expect((a * modInv(a, SECP256K1_P)) % SECP256K1_P).toBe(1n)
  })

  it('不可逆抛错', () => {
    expect(() => modInv(2n, 4n)).toThrow('模逆元不存在')
  })
})

describe('点运算', () => {
  it('G 在曲线上', () => {
    expect(isOnCurve(G)).toBe(true)
  })

  it('O + G = G', () => {
    expect(pointAdd(null, G)).toEqual(G)
  })

  it('G + O = G', () => {
    expect(pointAdd(G, null)).toEqual(G)
  })

  it('G + (−G) = O', () => {
    expect(pointAdd(G, { x: G.x, y: SECP256K1_P - G.y })).toBeNull()
  })

  it('G + G = 2G（退化为加倍，与 pointDouble 一致）', () => {
    expect(pointAdd(G, G)).toEqual(pointDouble(G))
  })

  it('2G 在曲线上且 x 已知', () => {
    const p2 = pointDouble(G)
    expect(isOnCurve(p2)).toBe(true)
    expect(p2.x.toString(16)).toBe(
      'c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
    )
  })

  it('点加结果在曲线上', () => {
    const p = pointAdd(pointDouble(G), G)
    expect(p).not.toBeNull()
    expect(isOnCurve(p!)).toBe(true)
  })
})

describe('pointMul', () => {
  it('1·G = G', () => {
    expect(pointMul(1n)).toEqual(G)
  })

  it('n·G 拒绝（标量越界）', () => {
    expect(() => pointMul(SECP256K1_N)).toThrow('1 ≤ k < n')
    expect(() => pointMul(0n)).toThrow('1 ≤ k < n')
  })

  it('(n−1)·G = −G', () => {
    const p = pointMul(SECP256K1_N - 1n)
    expect(p.x).toBe(G.x)
    expect(p.y).toBe(SECP256K1_P - G.y)
  })
})

describe('parsePrivateKeyHex', () => {
  it('带 0x 与不带 0x', () => {
    expect(parsePrivateKeyHex(PRIV1)).toBe(1n)
    expect(parsePrivateKeyHex(PRIV1.slice(2))).toBe(1n)
  })

  it('格式错误抛错', () => {
    expect(() => parsePrivateKeyHex('0x1234')).toThrow('64 位十六进制')
    expect(() => parsePrivateKeyHex('')).toThrow('64 位十六进制')
  })

  it('全零 / n 越界抛错', () => {
    expect(() => parsePrivateKeyHex('0'.repeat(64))).toThrow('1 ≤ k < n')
    expect(() => parsePrivateKeyHex(SECP256K1_N.toString(16).padStart(64, '0'))).toThrow(
      '1 ≤ k < n',
    )
  })
})

describe('privateToPublic（独立测试向量）', () => {
  it('k=1', () => {
    const { uncompressed, compressed } = privateToPublic(PRIV1)
    expect(compressed).toBe('0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
    expect(uncompressed).toBe(
      '0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798' +
        '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
    )
  })

  it('k=2', () => {
    expect(privateToPublic(PRIV2).compressed).toBe(
      '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
    )
  })

  it('k=3（y 为偶数 → 02 前缀）', () => {
    expect(privateToPublic(PRIV3).compressed).toBe(
      '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
    )
  })

  it('随机私钥向量', () => {
    expect(privateToPublic(PRIV_R).compressed).toBe(
      '039fe042d823a471fcb127733a296fdf1edfa6464bf02f8fb34110407be34d9390',
    )
  })
})

describe('publicToAddress / privateKeyInfo（独立测试向量）', () => {
  it('k=1 地址', () => {
    expect(privateKeyInfo(PRIV1).address).toBe('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
  })

  it('k=2 地址', () => {
    expect(privateKeyInfo(PRIV2).address).toBe('0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF')
  })

  it('k=3 地址', () => {
    expect(privateKeyInfo(PRIV3).address).toBe('0x6813Eb9362372EEF6200f3b1dbC3f819671cBA69')
  })

  it('随机私钥地址', () => {
    expect(privateKeyInfo(PRIV_R).address).toBe('0x0e8d57CBAcba585843EFb5e2f7Ff83b19816a34d')
  })

  it('publicToAddress 接受 0x 前缀', () => {
    const { uncompressed } = privateToPublic(PRIV1)
    expect(publicToAddress(`0x${uncompressed}`)).toBe('0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf')
  })

  it('公钥格式错误抛错', () => {
    expect(() => publicToAddress('0x1234')).toThrow('130 位十六进制')
    expect(() => publicToAddress(`04${'ab'.repeat(63)}`)).toThrow('130 位十六进制')
  })

  it('非 04 开头抛错', () => {
    expect(() => publicToAddress(`05${'ab'.repeat(64)}`)).toThrow('以 04 开头')
  })
})

describe('keccak256 / hex 工具（与 #691 同构，标准向量）', () => {
  function keccakHex(s: string): string {
    return bytesToHex(keccak256(new TextEncoder().encode(s)))
  }

  it('空字符串', () => {
    expect(keccakHex('')).toBe('c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470')
  })

  it('"abc"', () => {
    expect(keccakHex('abc')).toBe(
      '4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45',
    )
  })

  it('"hello"', () => {
    expect(keccakHex('hello')).toBe(
      '1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
    )
  })

  it('toChecksumAddress 官方向量', () => {
    expect(toChecksumAddress('5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')).toBe(
      '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    )
  })

  it('toChecksumAddress 接受 0x / 0X 前缀', () => {
    const expected = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
    expect(toChecksumAddress('0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')).toBe(expected)
    expect(toChecksumAddress('0X5aaeb6053f3e94c9b9a09f33669435e7ef1beaed')).toBe(expected)
  })

  it('hexToBytes 非法抛错', () => {
    expect(() => hexToBytes('abc')).toThrow('hex 格式错误')
    expect(() => hexToBytes('zz')).toThrow('hex 格式错误')
  })
})
