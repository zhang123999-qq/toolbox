/**
 * high-contrast（#737）utils 单测：纯函数，无 DOM 依赖。
 */
import { describe, expect, it } from 'vitest'
import {
  buildContrastReport,
  checkContrastPair,
  contrastRatio,
  generateHighContrastCss,
  relativeLuminance,
  validateHexColor,
  validateMode,
} from './utils'

describe('validateHexColor', () => {
  it('规范化 3 位与 6 位 hex', () => {
    expect(validateHexColor('#abc', '颜色')).toBe('#aabbcc')
    expect(validateHexColor('#AABBCC', '颜色')).toBe('#aabbcc')
  })
  it('非法颜色抛中文错', () => {
    expect(() => validateHexColor('red', '前景颜色')).toThrow('前景颜色不合法')
    expect(() => validateHexColor('#12', '前景颜色')).toThrow('不合法')
  })
})

describe('validateMode', () => {
  it('三种模式通过', () => {
    expect(validateMode('dark')).toBe('dark')
    expect(validateMode('light')).toBe('light')
    expect(validateMode('forced')).toBe('forced')
  })
  it('非法模式抛错', () => {
    expect(() => validateMode('auto')).toThrow('模式不合法')
  })
})

describe('contrastRatio', () => {
  it('黑白 21:1（WCAG 官方值）', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
    expect(relativeLuminance('#000000')).toBe(0)
  })
  it('同色 1:1', () => {
    expect(contrastRatio('#123456', '#123456')).toBeCloseTo(1, 5)
  })
})

describe('checkContrastPair', () => {
  it('黑白三项全通过', () => {
    const c = checkContrastPair('#000000', '#ffffff')
    expect(c.passAA).toBe(true)
    expect(c.passAAA).toBe(true)
    expect(c.passUI).toBe(true)
  })
  it('低对比三项不通过', () => {
    const c = checkContrastPair('#777777', '#888888')
    expect(c.passAA).toBe(false)
    expect(c.passAAA).toBe(false)
    expect(c.passUI).toBe(false)
  })
  it('中等对比仅 UI 通过', () => {
    // #808080 on white ≈ 3.95:1 → UI 通过、AA 不通过
    const c = checkContrastPair('#808080', '#ffffff')
    expect(c.ratio).toBeGreaterThanOrEqual(3)
    expect(c.passAA).toBe(false)
    expect(c.passUI).toBe(true)
  })
  it('非法颜色抛错', () => {
    expect(() => checkContrastPair('red', '#fff')).toThrow('不合法')
  })
})

describe('generateHighContrastCss', () => {
  const base = { background: '#000000', foreground: '#ffffff', linkColor: '#ffff00', mode: 'dark' as const }

  it('dark 模式生成变量与规则', () => {
    const css = generateHighContrastCss(base)
    expect(css).toContain('--hc-bg: #000000;')
    expect(css).toContain('--hc-fg: #ffffff;')
    expect(css).toContain('--hc-link: #ffff00;')
    expect(css).toContain('.hc-theme a {')
    expect(css).toContain('@media (forced-colors: active)')
    expect(css).toContain('background-color: Canvas;')
    expect(css).toContain('color: CanvasText;')
    expect(css).toContain('outline-color: Highlight;')
  })
  it('forced 模式含 forced-color-adjust 例外类', () => {
    const css = generateHighContrastCss({ ...base, mode: 'forced' })
    expect(css).toContain('.hc-force-only')
  })
  it('dark 模式不含 forced 例外类', () => {
    expect(generateHighContrastCss(base)).not.toContain('.hc-force-only')
  })
  it('3 位 hex 被规范化', () => {
    const css = generateHighContrastCss({ ...base, background: '#000' })
    expect(css).toContain('--hc-bg: #000000;')
  })
  it('非法参数抛错', () => {
    expect(() => generateHighContrastCss({ ...base, background: 'black' })).toThrow('不合法')
    expect(() => generateHighContrastCss({ ...base, mode: 'auto' as never })).toThrow('模式不合法')
  })
})

describe('buildContrastReport', () => {
  it('报告含两行与结论', () => {
    const r = buildContrastReport({
      background: '#000000',
      foreground: '#ffffff',
      linkColor: '#ffff00',
      mode: 'dark',
    })
    expect(r).toContain('正文')
    expect(r).toContain('链接')
    expect(r).toContain('21.00:1')
    expect(r).toContain('AAA 通过')
  })
  it('低对比报告写未通过', () => {
    const r = buildContrastReport({
      background: '#ffffff',
      foreground: '#eeeeee',
      linkColor: '#dddddd',
      mode: 'light',
    })
    expect(r).toContain('未通过')
  })
  it('中等对比报告写仅 UI 级别通过', () => {
    const r = buildContrastReport({
      background: '#ffffff',
      foreground: '#808080',
      linkColor: '#808080',
      mode: 'light',
    })
    expect(r).toContain('仅 UI 级别通过')
  })
  it('AA 级对比报告写 AA 通过', () => {
    const r = buildContrastReport({
      background: '#ffffff',
      foreground: '#767676',
      linkColor: '#767676',
      mode: 'light',
    })
    expect(r).toContain('AA 通过')
  })
})
