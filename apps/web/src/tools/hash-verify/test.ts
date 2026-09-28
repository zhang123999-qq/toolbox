import { describe, expect, it } from 'vitest'
import {
  bytesToHex,
  normalizeHash,
  parseData,
  verifyHash,
  type Algorithm,
  type DigestFn,
} from './utils'
import type { HashVerifyInput, HashVerifyOptions } from './schema'

const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

function input(text: string): HashVerifyInput {
  return { text }
}

function opts(over: Partial<HashVerifyOptions> = {}): HashVerifyOptions {
  return { expected: ABC_SHA256, algo: 'SHA-256', format: 'text', ...over }
}

/** 固定返回全零 digest 的 mock（32 字节） */
const zeroDigest: DigestFn = async () => new Uint8Array(32)

describe('hash-verify · bytesToHex/normalizeHash', () => {
  it('bytesToHex', () => {
    expect(bytesToHex(Uint8Array.of(0x0a, 0xff))).toBe('0aff')
  })

  it('normalizeHash 去空白/0x/大小写', () => {
    expect(normalizeHash('  0xAB cd\n')).toBe('abcd')
    expect(normalizeHash('AABB')).toBe('aabb')
  })
})

describe('hash-verify · parseData', () => {
  it('text 格式', () => {
    expect(bytesToHex(parseData('abc', 'text'))).toBe('616263')
  })

  it('hex 格式', () => {
    expect(bytesToHex(parseData('0x616263', 'hex'))).toBe('616263')
    expect(bytesToHex(parseData('61 62 63', 'hex'))).toBe('616263')
  })

  it('hex 空输入报错', () => {
    expect(() => parseData('   ', 'hex')).toThrow('hex 输入为空')
  })

  it('hex 奇数长度报错', () => {
    expect(() => parseData('abc', 'hex')).toThrow('hex 长度须为偶数')
  })

  it('hex 非法字符报错', () => {
    expect(() => parseData('zzzz', 'hex')).toThrow('hex 含非法字符')
  })
})

describe('hash-verify · verifyHash（真实 WebCrypto）', () => {
  it('SHA-256("abc") 匹配', async () => {
    const r = await verifyHash(input('abc'), opts())
    expect(r.match).toBe(true)
    expect(r.actual).toBe(ABC_SHA256)
    expect(r.algo).toBe('SHA-256')
    expect(r.note).toBeUndefined()
  })

  it('期望值大小写/0x/空白均可', async () => {
    const r = await verifyHash(input('abc'), opts({ expected: '  0X' + ABC_SHA256.toUpperCase() + '\n' }))
    expect(r.match).toBe(true)
  })

  it('不匹配', async () => {
    const r = await verifyHash(input('abd'), opts())
    expect(r.match).toBe(false)
    expect(r.actual).not.toBe(ABC_SHA256)
  })

  it('hex 输入数据', async () => {
    const r = await verifyHash(input('616263'), opts({ format: 'hex' }))
    expect(r.match).toBe(true)
  })

  it('SHA-1 向量', async () => {
    const r = await verifyHash(
      input('abc'),
      opts({ expected: 'a9993e364706816aba3e25717850c26c9cd0d89d', algo: 'SHA-1' }),
    )
    expect(r.match).toBe(true)
  })

  it('SHA-512 长度校验', async () => {
    const r = await verifyHash(input('abc'), opts({ expected: ABC_SHA256, algo: 'SHA-512' }))
    expect(r.match).toBe(false)
    expect(r.note).toContain('长度 64 与 SHA-512 应有长度 128 不符')
    expect(r.actual).toHaveLength(128)
  })

  it('期望哈希为空报错', async () => {
    await expect(verifyHash(input('abc'), opts({ expected: '  ' }))).rejects.toThrow('期望哈希不能为空')
  })

  it('期望哈希非法字符报错', async () => {
    await expect(verifyHash(input('abc'), opts({ expected: 'zz' }))).rejects.toThrow('期望哈希含非法 hex 字符')
  })

  it('SHA-384 算法分支', async () => {
    const algo: Algorithm = 'SHA-384'
    const r = await verifyHash(input('abc'), {
      expected: 'cb00753f45a35e8bb5a52d7c87ab0c6c8a4f5a5b',
      algo,
      format: 'text',
    })
    // 长度不符走 note 分支（digest 照常计算）
    expect(r.note).toContain('SHA-384')
    expect(r.actual).toHaveLength(96)
  })
})

describe('hash-verify · webCryptoDigest 异常分支', () => {
  it('无 crypto 时报错', async () => {
    const g = globalThis as unknown as Record<string, unknown>
    const saved = g.crypto
    delete g.crypto
    try {
      await expect(verifyHash(input('abc'), opts(), undefined as unknown as DigestFn)).rejects.toThrow()
    } finally {
      g.crypto = saved
    }
  })

  it('无 subtle 时报错', async () => {
    const g = globalThis as unknown as Record<string, unknown>
    const saved = g.crypto
    g.crypto = {}
    try {
      await expect(verifyHash(input('abc'), opts(), undefined as unknown as DigestFn)).rejects.toThrow(
        '当前环境不支持 WebCrypto',
      )
    } finally {
      g.crypto = saved
    }
  })

  it('注入 digest 生效', async () => {
    const r = await verifyHash(input('abc'), opts({ expected: '00'.repeat(32) }), zeroDigest)
    expect(r.match).toBe(true)
    expect(r.actual).toBe('00'.repeat(32))
  })
})
