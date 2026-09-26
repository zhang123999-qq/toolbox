import { describe, expect, it } from 'vitest'
import { SecurityHeadersError, evaluate, parseHeaders, transform } from './utils'
import type { SecurityHeadersInput } from './schema'

const input = (text: string): SecurityHeadersInput => ({ text })
const levelOf = (headers: string, headerName: string) =>
  evaluate(parseHeaders(headers)).find((f) => f.header === headerName)?.level

describe('security-headers / parseHeaders', () => {
  it('跳过状态行、键小写、同名头合并', () => {
    const map = parseHeaders('HTTP/2 200\nSet-Cookie: a=1\nSet-Cookie: b=2\n')
    expect(map.get('set-cookie')).toBe('a=1, b=2')
  })
})

describe('security-headers / evaluate', () => {
  it('缺失 HSTS = 风险', () => {
    expect(levelOf('Content-Type: text/html', 'Strict-Transport-Security')).toBe('风险')
  })

  it('HSTS max-age=0 = 风险；过短 = 提示；足够长 = 通过', () => {
    expect(levelOf('Strict-Transport-Security: max-age=0', 'Strict-Transport-Security')).toBe(
      '风险',
    )
    expect(levelOf('Strict-Transport-Security: max-age=100', 'Strict-Transport-Security')).toBe(
      '提示',
    )
    expect(
      levelOf(
        'Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
        'Strict-Transport-Security',
      ),
    ).toBe('通过')
  })

  it('缺 CSP = 缺失；含 unsafe-inline = 风险；干净策略 = 通过', () => {
    expect(levelOf('X: y', 'Content-Security-Policy')).toBe('缺失')
    expect(
      levelOf(
        "Content-Security-Policy: script-src 'self' 'unsafe-inline'",
        'Content-Security-Policy',
      ),
    ).toBe('风险')
    expect(levelOf("Content-Security-Policy: default-src 'self'", 'Content-Security-Policy')).toBe(
      '通过',
    )
  })

  it('X-Frame-Options 取值判定', () => {
    expect(levelOf('X-Frame-Options: DENY', 'X-Frame-Options')).toBe('通过')
    expect(levelOf('X-Frame-Options: ALLOWALL', 'X-Frame-Options')).toBe('风险')
    expect(levelOf('X: y', 'X-Frame-Options')).toBe('提示')
  })

  it('CSP 含 frame-ancestors 时把缺 X-Frame-Options 提为通过', () => {
    expect(levelOf("Content-Security-Policy: frame-ancestors 'none'", 'X-Frame-Options')).toBe(
      '通过',
    )
  })

  it('X-Content-Type-Options nosniff = 通过，缺失 = 提示', () => {
    expect(levelOf('X-Content-Type-Options: nosniff', 'X-Content-Type-Options')).toBe('通过')
    expect(levelOf('X: y', 'X-Content-Type-Options')).toBe('提示')
  })

  it('Referrer-Policy unsafe-url = 风险', () => {
    expect(levelOf('Referrer-Policy: unsafe-url', 'Referrer-Policy')).toBe('风险')
  })

  it('回显 Server / X-Powered-By 给提示', () => {
    const findings = evaluate(parseHeaders('Server: nginx/1.25.3\nX-Powered-By: Express'))
    const disclosure = findings.filter(
      (f) => (f.header === 'Server' || f.header === 'X-Powered-By') && f.level === '提示',
    )
    expect(disclosure).toHaveLength(2)
  })
})

describe('security-headers / transform', () => {
  it('输出报告与逐项', () => {
    const out = transform(input('Content-Type: text/html'))
    expect(out).toContain('# 安全响应头检测报告')
    expect(out).toContain('Strict-Transport-Security')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform(input(''))).toBe('')
  })

  it('解析不到头 / 超长抛错（异常）', () => {
    expect(() => transform(input('plain text no colon header'))).toThrow(SecurityHeadersError)
    expect(() => transform(input('x'.repeat(200_001)))).toThrow(SecurityHeadersError)
  })
})
