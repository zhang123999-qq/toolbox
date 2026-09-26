import { describe, expect, it } from 'vitest'
import { CorsCheckError, evaluate, parseHeaders, transform } from './utils'
import type { CorsCheckInput } from './schema'

const input = (text: string): CorsCheckInput => ({ text })

describe('cors-check / parseHeaders', () => {
  it('跳过状态行与空行，统一小写键', () => {
    const map = parseHeaders('HTTP/1.1 200 OK\nContent-Type: application/json\n\n')
    expect(map.has('content-type')).toBe(true)
    expect(map.get('content-type')).toBe('application/json')
  })

  it('同名头逗号合并', () => {
    const map = parseHeaders('Vary: Accept-Encoding\nVary: Origin')
    expect(map.get('vary')).toBe('Accept-Encoding, Origin')
  })
})

describe('cors-check / evaluate', () => {
  const levelOf = (headers: string, headerName: string) =>
    evaluate(parseHeaders(headers)).find((f) => f.header === headerName)?.level

  it('通配符 + 凭据 = 问题（浏览器会拒绝）', () => {
    expect(
      levelOf(
        'Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true',
        'Access-Control-Allow-Origin',
      ),
    ).toBe('问题')
  })

  it('仅通配符 = 风险', () => {
    expect(levelOf('Access-Control-Allow-Origin: *', 'Access-Control-Allow-Origin')).toBe('风险')
  })

  it('回显 null = 风险', () => {
    expect(levelOf('Access-Control-Allow-Origin: null', 'Access-Control-Allow-Origin')).toBe('风险')
  })

  it('具体来源且带 Vary: Origin = 通过，不再提示 Vary', () => {
    const findings = evaluate(
      parseHeaders('Access-Control-Allow-Origin: https://a.com\nVary: Origin'),
    )
    expect(findings.find((f) => f.header === 'Access-Control-Allow-Origin')?.level).toBe('通过')
    expect(findings.some((f) => f.header === 'Vary' && f.level === '提示')).toBe(false)
  })

  it('具体来源但缺 Vary: Origin 给出提示', () => {
    expect(levelOf('Access-Control-Allow-Origin: https://a.com', 'Vary')).toBe('提示')
  })

  it('非法 Max-Age = 问题', () => {
    expect(
      levelOf(
        'Access-Control-Allow-Origin: *\nAccess-Control-Max-Age: soon',
        'Access-Control-Max-Age',
      ),
    ).toBe('问题')
  })

  it('带凭据时 Allow-Headers: * 标风险', () => {
    expect(
      levelOf(
        'Access-Control-Allow-Origin: https://a.com\nAccess-Control-Allow-Credentials: true\nAccess-Control-Allow-Headers: *',
        'Access-Control-Allow-Headers',
      ),
    ).toBe('风险')
  })

  it('没有任何 CORS 头只给提示', () => {
    const findings = evaluate(parseHeaders('Content-Type: text/html'))
    expect(findings.every((f) => f.level !== '问题' && f.level !== '风险')).toBe(true)
  })
})

describe('cors-check / transform', () => {
  it('输出报告标题、结论与逐项', () => {
    const out = transform(
      input('Access-Control-Allow-Origin: *\nAccess-Control-Allow-Credentials: true'),
    )
    expect(out).toContain('# CORS 配置检测报告')
    expect(out).toContain('【问题】')
    expect(out).toContain('[问题] Access-Control-Allow-Origin')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform(input('   '))).toBe('')
  })

  it('解析不到头 / 超长抛错（异常）', () => {
    expect(() => transform(input('no header here'))).toThrow(CorsCheckError)
    expect(() => transform(input('x'.repeat(200_001)))).toThrow(CorsCheckError)
  })
})
