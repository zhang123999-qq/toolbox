import { describe, expect, it } from 'vitest'
import { derToPem, generate, toBase64, transform } from './utils'
import type { KeyGenOptions } from './schema'

const base: KeyGenOptions = { type: 'aes-hmac', bits: '128', curve: 'P-256', format: 'hex' }

describe('key-generate / 对称密钥', () => {
  it('AES-128 等价长度：hex 输出 32 个字符（16 字节）', async () => {
    const out = await generate(base)
    expect(out).toMatch(/^[0-9a-f]{32}$/)
  })

  it('128 / 192 / 256 位分别输出 32 / 48 / 64 个十六进制字符', async () => {
    for (const [bits, length] of [
      ['128', 32],
      ['192', 48],
      ['256', 64],
    ] as const) {
      const out = await generate({ ...base, bits })
      expect(out).toHaveLength(length)
    }
  })

  it('base64 输出是 256 位密钥的 44 字符 base64', async () => {
    const out = await generate({ ...base, bits: '256', format: 'base64' })
    expect(out).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(out).toHaveLength(44)
  })

  it('jwk 输出是合法的 oct JWK', async () => {
    const out = await generate({ ...base, bits: '256', format: 'jwk' })
    const jwk = JSON.parse(out) as { kty: string; k: string }
    expect(jwk.kty).toBe('oct')
    expect(typeof jwk.k).toBe('string')
  })

  it('对称密钥请求 PEM 时报错', async () => {
    await expect(generate({ ...base, format: 'pem' })).rejects.toThrow(/PEM/)
  })

  it('对称密钥长度给成 2048 时报错', async () => {
    await expect(generate({ ...base, bits: '2048' })).rejects.toThrow(/128 \/ 192 \/ 256/)
  })
})

describe('key-generate / 非对称密钥', () => {
  it('RSA-2048 输出 PKCS#8 私钥 PEM', async () => {
    const out = await generate({ ...base, type: 'rsa', bits: '2048', format: 'pem' })
    expect(out).toMatch(/^-----BEGIN PRIVATE KEY-----\n/)
    expect(out).toMatch(/\n-----END PRIVATE KEY-----\n$/)
    for (const line of out.trim().split('\n').slice(1, -1)) {
      expect(line.length).toBeLessThanOrEqual(64)
    }
  })

  it('RSA 位数给成 128 时报错', async () => {
    await expect(generate({ ...base, type: 'rsa', bits: '128' })).rejects.toThrow(
      /2048 \/ 3072 \/ 4096/,
    )
  })

  it('EC（P-256）输出私钥 PEM', async () => {
    const out = await generate({ ...base, type: 'ec', curve: 'P-256', format: 'pem' })
    expect(out).toContain('-----BEGIN PRIVATE KEY-----')
  })

  it('EC 曲线选 Ed25519 时报错（类型不匹配）', async () => {
    await expect(generate({ ...base, type: 'ec', curve: 'Ed25519' })).rejects.toThrow(/P-256/)
  })

  it('Ed25519 输出私钥 PEM', async () => {
    const out = await generate({ ...base, type: 'ed25519', format: 'pem' })
    expect(out).toContain('-----BEGIN PRIVATE KEY-----')
    expect(out).toContain('-----END PRIVATE KEY-----')
  })

  it('非对称 jwk 输出私钥与公钥两个 JWK', async () => {
    const out = await generate({ ...base, type: 'ec', curve: 'P-256', format: 'jwk' })
    const parsed = JSON.parse(out) as { privateKey: { kty: string }; publicKey: { kty: string } }
    expect(parsed.privateKey.kty).toBe('EC')
    expect(parsed.publicKey.kty).toBe('EC')
  })

  it('非对称密钥 hex 输出可解回 DER 字节（PKCS#8）', async () => {
    const out = await generate({ ...base, type: 'ed25519', format: 'hex' })
    expect(out).toMatch(/^[0-9a-f]+$/)
    expect(out.length / 2).toBeGreaterThan(32)
  })

  it('两次生成的密钥不同（随机性）', async () => {
    const first = await generate(base)
    const second = await generate(base)
    expect(second).not.toBe(first)
  })
})

describe('key-generate / derToPem 与边界', () => {
  it('derToPem 按 64 字符换行并包上头尾', () => {
    const der = new Uint8Array(100).fill(0xab)
    const pem = derToPem(der, 'PRIVATE KEY')
    const lines = pem.trim().split('\n')
    expect(lines[0]).toBe('-----BEGIN PRIVATE KEY-----')
    expect(lines[lines.length - 1]).toBe('-----END PRIVATE KEY-----')
    expect(lines[1]).toHaveLength(64)
    expect(lines[2]).toHaveLength(64)
    expect(lines[3]).toHaveLength(8)
    // 去掉头尾后拼起来应等于 DER 的 base64
    expect(lines.slice(1, -1).join('')).toBe(toBase64(der))
  })

  it('空输入返回空串（输入框只作触发用）', async () => {
    await expect(transform({ text: '' }, base)).resolves.toBe('')
  })

  it('超过 200,000 字符上限时报错', async () => {
    await expect(transform({ text: 'a'.repeat(200001) }, base)).rejects.toThrow(/200,000/)
  })

  it('填入任意内容即触发生成', async () => {
    const out = await transform({ text: 'generate' }, base)
    expect(out).toMatch(/^[0-9a-f]{32}$/)
  })
})
