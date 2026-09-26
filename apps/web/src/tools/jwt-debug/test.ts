import { describe, expect, it } from 'vitest'
import { SignJWT } from 'jose'
import type { JwtDebugOptions } from './schema'
import { decodeDebug, transform, verifyToken } from './utils'

/** 示例 token（与 Tool.tsx 一致），HS256 */
const SAMPLE =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5OX0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

const NONE: JwtDebugOptions = { secret: '', publicKeyPem: '' }

/** 用 jose 现签一个 HS256 token，用于验签正向用例 */
async function sign(secret: string, payload: Record<string, unknown>): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).sign(key)
}

describe('jwt-debug / decodeDebug', () => {
  it('解出 header 与 payload', () => {
    const { header, payload, lines } = decodeDebug(SAMPLE)
    expect(header['alg']).toBe('HS256')
    expect(payload['sub']).toBe('1234567890')
    expect(lines).toContainEqual(expect.stringContaining('过期时间（exp）'))
  })

  it('JWE（5 段）给出中文提示', () => {
    expect(() => decodeDebug('a.b.c.d.e')).toThrow(/JWE/)
  })

  it('段数不对报错', () => {
    expect(() => decodeDebug('a.b')).toThrow(/3 段/)
  })

  it('非法 base64url 报错', () => {
    expect(() => decodeDebug('!!!.@@@.###')).toThrow(/解码失败/)
  })
})

describe('jwt-debug / verifyToken', () => {
  it('不填密钥时只说明不验签', async () => {
    const out = await verifyToken(SAMPLE, NONE)
    expect(out).toContain('未提供密钥')
  })

  it('正确密钥验签通过', async () => {
    const token = await sign('0123456789abcdef0123456789abcdef', { sub: 'u1' })
    const out = await verifyToken(token, {
      secret: '0123456789abcdef0123456789abcdef',
      publicKeyPem: '',
    })
    expect(out).toContain('验签通过')
  })

  it('错误密钥验签失败', async () => {
    const token = await sign('0123456789abcdef0123456789abcdef', { sub: 'u1' })
    const out = await verifyToken(token, {
      secret: 'wrong-secret-wrong-secret-xx',
      publicKeyPem: '',
    })
    expect(out).toContain('验签失败')
  })

  it('对称算法却填公钥 PEM 给出友好提示', async () => {
    const token = await sign('0123456789abcdef0123456789abcdef', { sub: 'u1' })
    const out = await verifyToken(token, { secret: '', publicKeyPem: 'not a pem' })
    expect(out).toContain('验签失败')
  })
})

describe('jwt-debug / transform', () => {
  it('空输入返回空串', async () => {
    await expect(transform({ text: '   ' }, NONE)).resolves.toBe('')
  })

  it('端到端输出三段结构', async () => {
    const out = await transform({ text: SAMPLE }, NONE)
    expect(out).toContain('## Header')
    expect(out).toContain('## Payload')
    expect(out).toContain('## 验签')
    expect(out).toContain('"sub": "1234567890"')
  })

  it('超长输入报错', async () => {
    await expect(transform({ text: 'x'.repeat(200001) }, NONE)).rejects.toThrow(/上限/)
  })
})
