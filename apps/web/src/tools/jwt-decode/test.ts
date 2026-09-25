import { describe, expect, it } from 'vitest'
import { decodeBase64Url, decodeJwt, describeClaims, formatDecoded, transform } from './utils'

const pretty = { format: 'pretty' } as const
const compact = { format: 'compact' } as const

/** HS256 示例令牌（payload 无时间声明） */
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA'

/** 带 iat / exp 的令牌：iat=1700000000，exp=1700003600 */
const EXPIRING =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwMDM2MDB9.9JP1sdnJLm-Ymz3Ofk8G6x6CdZ7z-McuG_-uy_OZfDk'

describe('jwt-decode / base64url', () => {
  it('解码 URL-safe 段（含中文）', () => {
    const payload = decodeBase64Url(
      'eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0',
    )
    expect(JSON.parse(payload).name).toBe('工具库 Toolbox')
  })
})

describe('jwt-decode / 解析', () => {
  it('读出 header 与 payload', () => {
    const decoded = decodeJwt(TOKEN)
    expect(decoded.header).toEqual({ alg: 'HS256', typ: 'JWT' })
    expect((decoded.payload as Record<string, unknown>).sub).toBe('1234567890')
    expect(decoded.signature.length).toBeGreaterThan(20)
  })

  it('JWE（5 段）给出明确指引而不是当成 JWT', () => {
    expect(() => decodeJwt('a.b.c.d.e')).toThrow(/JWE/)
  })

  it('段数不对或内容不是 JSON 时报错', () => {
    expect(() => decodeJwt('only-one-part')).toThrow(/应由 3 段组成/)
    // 'bm90LWpzb24' 是 "not-json" 的 base64url：能解码，但解码结果不是 JSON
    expect(() => decodeJwt('eyJhIjoxfQ.bm90LWpzb24.sig')).toThrow(/不是合法的 JSON/)
  })

  it('pretty 输出带缩进，compact 输出一行', () => {
    const decoded = decodeJwt(TOKEN)
    expect(formatDecoded(decoded, pretty)).toContain('\n  "header"')
    expect(formatDecoded(decoded, compact)).not.toContain('\n')
  })
})

describe('jwt-decode / 时间声明', () => {
  it('注入 now 后过期判断可断言', () => {
    const decoded = decodeJwt(EXPIRING)
    const atIssue = describeClaims(decoded.payload, 1700000000_000)
    expect(atIssue.join('\n')).toContain('2023-11-14T22:13:20.000Z')
    expect(atIssue.join('\n')).toContain('未过期，还剩 3600 秒')

    const afterExpiry = describeClaims(decoded.payload, 1700004000_000)
    expect(afterExpiry.join('\n')).toContain('已过期（超过 400 秒）')
  })

  it('无时间声明时不附加时间说明', () => {
    expect(describeClaims(decodeJwt(TOKEN).payload)).toEqual([])
  })
})

describe('jwt-decode / transform', () => {
  it('解析示例令牌', () => {
    expect(transform({ text: TOKEN }, pretty)).toContain('"alg": "HS256"')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, pretty)).toBe('')
    expect(transform({ text: '   ' }, compact)).toBe('')
  })
})
