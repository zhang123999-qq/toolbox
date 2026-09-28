/**
 * mnemonic（#702）utils 单测：
 * 手写 SHA-256 / SHA-512 / HMAC / PBKDF2（Node crypto 交叉验证）；
 * BIP39 官方测试向量。
 */
import { pbkdf2Sync, createHash, createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  defaultRandomSource,
  entropyToMnemonic,
  generateMnemonic,
  hmacSha512,
  mnemonicToEntropy,
  mnemonicToSeed,
  pbkdf2HmacSha512,
  sha256Bytes,
  sha512Bytes,
} from './utils'

const te = new TextEncoder()
const hexOf = (b: Uint8Array) => Buffer.from(b).toString('hex')

describe('sha256Bytes（手写）', () => {
  it('与 Node crypto 一致：空串/abc/长输入', () => {
    for (const msg of ['', 'abc', 'hello world', 'a'.repeat(1000)]) {
      expect(hexOf(sha256Bytes(te.encode(msg)))).toBe(createHash('sha256').update(msg).digest('hex'))
    }
  })
  it('已知向量', () => {
    expect(hexOf(sha256Bytes(te.encode('abc')))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})

describe('sha512Bytes（手写）', () => {
  it('与 Node crypto 一致', () => {
    for (const msg of ['', 'abc', 'hello world', 'x'.repeat(500)]) {
      expect(hexOf(sha512Bytes(te.encode(msg)))).toBe(createHash('sha512').update(msg).digest('hex'))
    }
  })
  it('已知向量', () => {
    expect(hexOf(sha512Bytes(te.encode('abc')))).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f',
    )
  })
})

describe('hmacSha512（手写）', () => {
  it('与 Node crypto 一致', () => {
    const cases: Array<[string, string]> = [
      ['key', 'The quick brown fox jumps over the lazy dog'],
      ['', ''],
      ['a'.repeat(200), 'long key'],
    ]
    for (const [k, m] of cases) {
      expect(hexOf(hmacSha512(te.encode(k), te.encode(m)))).toBe(
        createHmac('sha512', k).update(m).digest('hex'),
      )
    }
  })
})

describe('pbkdf2HmacSha512（手写）', () => {
  it('与 Node crypto 一致（1/2/5 轮）', () => {
    for (const iters of [1, 2, 5]) {
      expect(hexOf(pbkdf2HmacSha512(te.encode('password'), te.encode('salt'), iters, 64))).toBe(
        pbkdf2Sync('password', 'salt', iters, 64, 'sha512').toString('hex'),
      )
    }
  })
  it('dkLen 非 64 倍数截断', () => {
    expect(pbkdf2HmacSha512(te.encode('p'), te.encode('s'), 2, 100)).toHaveLength(100)
  })
  it('非法参数抛错', () => {
    expect(() => pbkdf2HmacSha512(te.encode('p'), te.encode('s'), 0, 64)).toThrow('迭代次数')
    expect(() => pbkdf2HmacSha512(te.encode('p'), te.encode('s'), 1, 0)).toThrow('派生长度')
  })
})

/** BIP39 官方测试向量（entropy → mnemonic） */
const BIP39_VECTORS: Array<[string, string]> = [
  [
    '00000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
  ],
  [
    '7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f',
    'legal winner thank year wave sausage worth useful legal winner thank yellow',
  ],
  [
    '0000000000000000000000000000000000000000000000000000000000000000',
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art',
  ],
  [
    'ffffffffffffffffffffffffffffffff',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
  ],
]

describe('entropyToMnemonic', () => {
  it('BIP39 官方向量', () => {
    for (const [entHex, expected] of BIP39_VECTORS) {
      const ent = new Uint8Array(Buffer.from(entHex, 'hex'))
      expect(entropyToMnemonic(ent)).toBe(expected)
    }
  })
  it('非法熵长度抛错', () => {
    expect(() => entropyToMnemonic(new Uint8Array(10))).toThrow('熵长度错误')
  })
})

describe('mnemonicToEntropy', () => {
  it('官方向量往返', () => {
    for (const [entHex, mnemonic] of BIP39_VECTORS) {
      expect(hexOf(mnemonicToEntropy(mnemonic))).toBe(entHex)
    }
  })
  it('非法词抛错', () => {
    expect(() =>
      mnemonicToEntropy(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon notaword',
      ),
    ).toThrow('词库中没有这个词')
  })
  it('checksum 错误抛错', () => {
    expect(() =>
      mnemonicToEntropy(
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon',
      ),
    ).toThrow('checksum')
  })
  it('词数错误抛错', () => {
    expect(() => mnemonicToEntropy('abandon abandon')).toThrow('词数错误')
  })
})

describe('generateMnemonic', () => {
  it('确定性随机源生成 12 词且可校验', () => {
    const m = generateMnemonic(12, (n) => new Uint8Array(n).fill(0x7f))
    expect(m.split(' ')).toHaveLength(12)
    expect(() => mnemonicToEntropy(m)).not.toThrow()
  })
  it('24 词', () => {
    const m = generateMnemonic(24, (n) => new Uint8Array(n))
    expect(m.split(' ')).toHaveLength(24)
  })
  it('非法词数抛错', () => {
    expect(() => generateMnemonic(13)).toThrow('词数错误')
  })
})

describe('mnemonicToSeed', () => {
  const MNEMONIC =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
  it('默认手写 PBKDF2 与 Node crypto 一致（2048 轮）', () => {
    const mine = hexOf(mnemonicToSeed(MNEMONIC, 'TREZOR'))
    const ref = pbkdf2Sync(MNEMONIC, 'mnemonicTREZOR', 2048, 64, 'sha512').toString('hex')
    expect(mine).toBe(ref)
  })
  it('空 passphrase 与 Node 一致', () => {
    const mine = hexOf(mnemonicToSeed(MNEMONIC))
    const ref = pbkdf2Sync(MNEMONIC, 'mnemonic', 2048, 64, 'sha512').toString('hex')
    expect(mine).toBe(ref)
  })
  it('种子长度 64 字节', () => {
    expect(mnemonicToSeed(MNEMONIC)).toHaveLength(64)
  })
  it('非法助记词抛错', () => {
    expect(() => mnemonicToSeed('abandon abandon')).toThrow('词数错误')
  })
})

describe('bytesToHex', () => {
  it('前导零保留', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff')
  })
})

describe('defaultRandomSource（分支补齐）', () => {
  it('返回指定长度的随机字节', () => {
    const a = defaultRandomSource(16)
    expect(a).toBeInstanceOf(Uint8Array)
    expect(a.length).toBe(16)
    const b = defaultRandomSource(16)
    // 随机源两次输出不同（碰撞概率可忽略）
    expect(bytesToHex(a) === bytesToHex(b)).toBe(false)
  })
})
