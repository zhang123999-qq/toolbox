import { describe, expect, it } from 'vitest'
import type { CspOptions } from './schema'
import { MODES, TARGETS, assertOptions, buildDirectives, headerName, transform } from './utils'

const base: CspOptions = {
  mode: 'header',
  target: 'self',
  strict: true,
  includeLower: false,
  includeUpper: false,
  includeNumbers: false,
}

const STRICT_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  'upgrade-insecure-requests',
]

describe('csp / buildDirectives', () => {
  it('严格模式给出固定的指令序列', () => {
    expect(buildDirectives(base)).toEqual(STRICT_DIRECTIVES)
  })

  it('宽松模式换成 object-src self / frame-ancestors self，且不加 base-uri 与升级', () => {
    const directives = buildDirectives({ ...base, strict: false })
    expect(directives).toContain("object-src 'self'")
    expect(directives).toContain("frame-ancestors 'self'")
    expect(directives).not.toContain("base-uri 'self'")
    expect(directives).not.toContain('upgrade-insecure-requests')
  })

  it('「包含小写字母」= 允许内联脚本', () => {
    expect(buildDirectives({ ...base, includeLower: true })).toContain(
      "script-src 'self' 'unsafe-inline'",
    )
  })

  it('「包含大写字母」= 允许内联样式', () => {
    expect(buildDirectives({ ...base, includeUpper: true })).toContain(
      "style-src 'self' 'unsafe-inline'",
    )
  })

  it('「包含数字」= 允许 eval，且两个开关同开时顺序稳定', () => {
    expect(buildDirectives({ ...base, includeNumbers: true })).toContain(
      "script-src 'self' 'unsafe-eval'",
    )
    expect(buildDirectives({ ...base, includeLower: true, includeNumbers: true })).toContain(
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    )
  })

  it('target 决定 default-src 的基础值', () => {
    expect(buildDirectives({ ...base, target: 'none' })[0]).toBe("default-src 'none'")
    expect(buildDirectives(base)[0]).toBe("default-src 'self'")
  })

  it('指令名不重复', () => {
    const names = buildDirectives(base).map((directive) => directive.split(' ')[0])
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('csp / transform', () => {
  it('首行是可直接粘贴的单行 Header，随后是可读版本', () => {
    const lines = transform({ text: 'generate' }, base).split('\n')
    expect(lines[0]).toBe(`Content-Security-Policy: ${STRICT_DIRECTIVES.join('; ')}`)
    expect(lines[1]).toBe('')
    expect(lines[2]).toBe('# 可读版本（每条指令一行）')
    expect(lines.slice(3)).toEqual(STRICT_DIRECTIVES)
  })

  it('report-only 换成观察用头名（策略内容不变）', () => {
    const lines = transform({ text: 'generate' }, { ...base, mode: 'report-only' }).split('\n')
    expect(lines[0].startsWith('Content-Security-Policy-Report-Only: ')).toBe(true)
    expect(lines.slice(3)).toEqual(STRICT_DIRECTIVES)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
    expect(transform({ text: '' }, { ...base, mode: 'report-only' })).toBe('')
  })

  it('非法模式与非法目标报错', () => {
    const badMode = { ...base, mode: 'bogus' } as unknown as CspOptions
    const badTarget = { ...base, target: 'cloudflare' } as unknown as CspOptions
    expect(() => headerName('bogus')).toThrow(/不支持的模式/)
    expect(() => assertOptions(badMode)).toThrow(/不支持的模式/)
    expect(() => assertOptions(badTarget)).toThrow(/不支持的目标/)
    expect(() => transform({ text: 'x' }, badMode)).toThrow(/不支持的模式/)
  })

  it('输入超过上限时报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('常量表与文档一致', () => {
    expect([...MODES]).toEqual(['header', 'report-only'])
    expect([...TARGETS]).toEqual(['self', 'none'])
  })
})
