/**
 * csp-config-ext（#777）utils 单测：CSP 策略生成与校验。
 */
import { describe, expect, it } from 'vitest'
import {
  buildCspPolicy,
  CSP_PRESET_NAMES,
  getCspPreset,
  parseCspConfigInput,
  parseCspPolicy,
  renderCspConfig,
  validateCsp,
} from './utils'

describe('getCspPreset', () => {
  it('返回 minimal 与 development 预设', () => {
    expect(getCspPreset('minimal').policy).toBe("script-src 'self'; object-src 'self'")
    expect(getCspPreset('development').policy).toContain("'wasm-unsafe-eval'")
    expect(CSP_PRESET_NAMES).toEqual(['minimal', 'development'])
  })
  it('未知预设报错', () => {
    expect(() => getCspPreset('strict')).toThrow('未知预设')
    expect(() => getCspPreset(123)).toThrow('未知预设')
  })
})

describe('buildCspPolicy', () => {
  it('默认生成最小策略', () => {
    expect(buildCspPolicy({ scriptSrc: [] })).toBe("script-src 'self'; object-src 'self'")
  })
  it('支持 wasm 宽松来源并去重', () => {
    const p = buildCspPolicy({ scriptSrc: ["'wasm-unsafe-eval'", "'self'", "'wasm-unsafe-eval'"] })
    expect(p).toBe("script-src 'self' 'wasm-unsafe-eval'; object-src 'self'")
  })
  it('支持自定义 objectSrc 与 styleSrc', () => {
    const p = buildCspPolicy({
      scriptSrc: [],
      objectSrc: "'none'",
      styleSrc: ["'self'", 'https://fonts.example.com'],
    })
    expect(p).toBe(
      "script-src 'self'; object-src 'none'; style-src 'self' https://fonts.example.com",
    )
  })
  it('非法来源报错', () => {
    expect(() => buildCspPolicy({ scriptSrc: ["'unsafe-eval'"] })).toThrow(
      'MV3 不允许的 script-src 来源',
    )
    expect(() => buildCspPolicy({ scriptSrc: ['https://cdn.example.com/lib.js'] })).toThrow(
      'MV3 不允许的 script-src 来源',
    )
    expect(() => buildCspPolicy({ scriptSrc: ["'unsafe-inline'"] })).toThrow(
      'MV3 不允许的 script-src 来源',
    )
  })
  it('参数形状错误报错', () => {
    expect(() => buildCspPolicy(null as never)).toThrow('scriptSrc 必须是数组')
    expect(() => buildCspPolicy({} as never)).toThrow('scriptSrc 必须是数组')
    expect(() => buildCspPolicy({ scriptSrc: [''] })).toThrow('scriptSrc 来源必须是非空字符串')
    expect(() => buildCspPolicy({ scriptSrc: [123 as never] })).toThrow(
      'scriptSrc 来源必须是非空字符串',
    )
    expect(() => buildCspPolicy({ scriptSrc: [], objectSrc: '   ' })).toThrow(
      'objectSrc必须是非空字符串',
    )
    expect(() => buildCspPolicy({ scriptSrc: [], styleSrc: [] })).toThrow(
      'styleSrc 提供时必须是非空数组',
    )
    expect(() => buildCspPolicy({ scriptSrc: [], styleSrc: 'x' as never })).toThrow(
      'styleSrc 提供时必须是非空数组',
    )
    expect(() => buildCspPolicy({ scriptSrc: [], styleSrc: [''] })).toThrow(
      'styleSrc 来源必须是非空字符串',
    )
  })
})

describe('parseCspPolicy', () => {
  it('解析多指令策略', () => {
    const d = parseCspPolicy("script-src 'self'; object-src 'self'; style-src 'self' https://a.com")
    expect(d['script-src']).toEqual(["'self'"])
    expect(d['style-src']).toEqual(["'self'", 'https://a.com'])
  })
  it('指令名大小写不敏感', () => {
    expect(parseCspPolicy("Script-Src 'self'")['script-src']).toEqual(["'self'"])
  })
  it('非法输入报错', () => {
    expect(() => parseCspPolicy('')).toThrow('CSP 策略必须是非空字符串')
    expect(() => parseCspPolicy(123)).toThrow('CSP 策略必须是非空字符串')
    expect(() => parseCspPolicy(';;;')).toThrow('未解析到任何 CSP 指令')
  })
})

describe('validateCsp', () => {
  it('最小策略无问题', () => {
    expect(validateCsp("script-src 'self'; object-src 'self'")).toEqual([])
  })
  it('远程代码报 error', () => {
    const issues = validateCsp("script-src 'self' https://cdn.example.com/x.js; object-src 'self'")
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('禁止远程代码'))).toBe(
      true,
    )
  })
  it('unsafe-eval 报 error 并提示 wasm-unsafe-eval', () => {
    const issues = validateCsp("script-src 'self' 'unsafe-eval'; object-src 'self'")
    expect(
      issues.some((i) => i.severity === 'error' && i.message.includes('wasm-unsafe-eval')),
    ).toBe(true)
  })
  it('unsafe-inline 报 warning', () => {
    const issues = validateCsp("script-src 'self' 'unsafe-inline'; object-src 'self'")
    expect(issues.some((i) => i.severity === 'warning' && i.source === "'unsafe-inline'")).toBe(
      true,
    )
  })
  it('缺少 script-src 报 error', () => {
    const issues = validateCsp("object-src 'self'")
    expect(issues.some((i) => i.severity === 'error' && i.directive === 'script-src')).toBe(true)
  })
  it('缺少 self 报 warning', () => {
    const issues = validateCsp("script-src 'wasm-unsafe-eval'; object-src 'self'")
    expect(issues.some((i) => i.severity === 'warning' && i.message.includes("'self'"))).toBe(true)
  })
  it('缺少 object-src 报 warning', () => {
    const issues = validateCsp("script-src 'self'")
    expect(issues.some((i) => i.directive === 'object-src' && i.severity === 'warning')).toBe(true)
  })
})

describe('parseCspConfigInput / renderCspConfig', () => {
  it('预设输入直接渲染', () => {
    const input = parseCspConfigInput('{"preset":"development"}')
    expect(renderCspConfig(input)).toContain("'wasm-unsafe-eval'")
  })
  it('自定义输入走构建路径', () => {
    const input = parseCspConfigInput(
      '{"scriptSrc":["\'wasm-unsafe-eval\'"],"objectSrc":"\'none\'"}',
    )
    expect(renderCspConfig(input)).toBe("script-src 'self' 'wasm-unsafe-eval'; object-src 'none'")
  })
  it('缺省 scriptSrc 时用空数组', () => {
    expect(renderCspConfig(parseCspConfigInput('{}'))).toBe("script-src 'self'; object-src 'self'")
  })
  it('合法 styleSrc 数组透传并渲染', () => {
    const input = parseCspConfigInput('{"styleSrc":["\'self\'"]}')
    expect(input.styleSrc).toEqual(["'self'"])
    expect(renderCspConfig(input)).toContain("style-src 'self'")
  })
  it('非法输入报错', () => {
    expect(() => parseCspConfigInput('')).toThrow('输入不能为空')
    expect(() => parseCspConfigInput('{bad')).toThrow('输入不是合法 JSON')
    expect(() => parseCspConfigInput('[1]')).toThrow('输入必须是 JSON 对象')
    expect(() => parseCspConfigInput('42')).toThrow('输入必须是 JSON 对象')
    expect(() => parseCspConfigInput('{"preset":1}')).toThrow('preset 必须是字符串')
    expect(() => parseCspConfigInput('{"preset":"nope"}')).toThrow('未知预设')
    expect(() => parseCspConfigInput('{"scriptSrc":"x"}')).toThrow('scriptSrc 必须是数组')
    expect(() => parseCspConfigInput('{"objectSrc":1}')).toThrow('objectSrc 必须是字符串')
    expect(() => parseCspConfigInput('{"styleSrc":{}}')).toThrow('styleSrc 必须是数组')
  })
})
