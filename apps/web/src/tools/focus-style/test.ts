/**
 * focus-style（#735）utils 单测：纯函数，无 DOM 依赖。
 */
import { describe, expect, it } from 'vitest'
import {
  UI_CONTRAST_MIN,
  buildCssWithComment,
  checkFocusContrast,
  contrastRatio,
  generateFocusStyle,
  relativeLuminance,
  validateHexColor,
  validateOutlineStyle,
  validatePx,
} from './utils'

describe('validateHexColor', () => {
  it('规范化 3 位与 6 位 hex', () => {
    expect(validateHexColor('#abc', '颜色')).toBe('#aabbcc')
    expect(validateHexColor('#AABBCC', '颜色')).toBe('#aabbcc')
    expect(validateHexColor('  #123456  ', '颜色')).toBe('#123456')
  })
  it('非法颜色抛中文错', () => {
    expect(() => validateHexColor('red', '焦点颜色')).toThrow('焦点颜色不合法')
    expect(() => validateHexColor('#12', '焦点颜色')).toThrow('不合法')
    expect(() => validateHexColor('#gggggg', '焦点颜色')).toThrow('不合法')
    expect(() => validateHexColor('', '焦点颜色')).toThrow('不合法')
  })
})

describe('validatePx', () => {
  it('非数字/非整数抛错', () => {
    expect(() => validatePx(NaN, '描边宽度', 1, 8)).toThrow('必须是数字')
    expect(() => validatePx(2.5, '描边宽度', 1, 8)).toThrow('必须是整数')
  })
  it('越界抛错', () => {
    expect(() => validatePx(0, '描边宽度', 1, 8)).toThrow('超出范围')
    expect(() => validatePx(9, '描边宽度', 1, 8)).toThrow('1–8px')
  })
  it('边界值通过', () => {
    expect(validatePx(1, '描边宽度', 1, 8)).toBe(1)
    expect(validatePx(8, '描边宽度', 1, 8)).toBe(8)
  })
})

describe('validateOutlineStyle', () => {
  it('四种样式通过', () => {
    for (const s of ['solid', 'dashed', 'dotted', 'double']) {
      expect(validateOutlineStyle(s)).toBe(s)
    }
  })
  it('非法样式抛错', () => {
    expect(() => validateOutlineStyle('groove')).toThrow('描边样式不合法')
  })
})

describe('relativeLuminance / contrastRatio', () => {
  it('黑=0，白=1', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5)
  })
  it('黑白对比度 21:1（WCAG 官方值）', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })
  it('同色对比度 1:1', () => {
    expect(contrastRatio('#2563eb', '#2563eb')).toBeCloseTo(1, 5)
  })
  it('顺序不影响结果', () => {
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(contrastRatio('#000000', '#ffffff'), 10)
  })
})

describe('checkFocusContrast', () => {
  it('高对比通过', () => {
    const c = checkFocusContrast('#000000', '#ffffff')
    expect(c.pass).toBe(true)
    expect(c.ratio).toBeCloseTo(21, 1)
  })
  it('低对比不通过', () => {
    const c = checkFocusContrast('#ffffff', '#ffffff')
    expect(c.pass).toBe(false)
    expect(c.ratio).toBeCloseTo(1, 5)
  })
  it(`阈值为 ${UI_CONTRAST_MIN}:1`, () => {
    expect(UI_CONTRAST_MIN).toBe(3)
  })
  it('非法颜色抛错', () => {
    expect(() => checkFocusContrast('red', '#fff')).toThrow('不合法')
  })
})

describe('generateFocusStyle', () => {
  const params = { color: '#2563eb', width: 2, offset: 2, radius: 4, outlineStyle: 'solid' as const }

  it('默认选择器生成标准 CSS', () => {
    const css = generateFocusStyle(params)
    expect(css).toContain(':focus-visible {')
    expect(css).toContain('outline: 2px solid #2563eb;')
    expect(css).toContain('outline-offset: 2px;')
    expect(css).toContain('border-radius: 4px;')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('transition: none;')
  })
  it('自定义选择器（预览作用域）', () => {
    const css = generateFocusStyle(params, '.demo :focus-visible')
    expect(css).toContain('.demo :focus-visible {')
  })
  it('参数全部生效', () => {
    const css = generateFocusStyle({
      color: '#abc',
      width: 3,
      offset: 0,
      radius: 8,
      outlineStyle: 'dashed',
    })
    expect(css).toContain('outline: 3px dashed #aabbcc;')
    expect(css).toContain('outline-offset: 0px;')
    expect(css).toContain('border-radius: 8px;')
  })
  it('非法参数抛错', () => {
    expect(() => generateFocusStyle({ ...params, color: 'red' })).toThrow('不合法')
    expect(() => generateFocusStyle({ ...params, width: 0 })).toThrow('超出范围')
    expect(() => generateFocusStyle({ ...params, offset: 17 })).toThrow('超出范围')
    expect(() => generateFocusStyle({ ...params, radius: -1 })).toThrow('超出范围')
    expect(() => generateFocusStyle({ ...params, outlineStyle: 'groove' as never })).toThrow(
      '描边样式不合法',
    )
  })
})

describe('buildCssWithComment', () => {
  it('注释含对比度与结论', () => {
    const css = buildCssWithComment(
      { color: '#000000', width: 2, offset: 2, radius: 4, outlineStyle: 'solid' },
      '#ffffff',
    )
    expect(css).toContain('21.00:1')
    expect(css).toContain('通过')
    expect(css).toContain(':focus-visible {')
  })
  it('未通过时注释写明', () => {
    const css = buildCssWithComment(
      { color: '#ffffff', width: 2, offset: 2, radius: 4, outlineStyle: 'solid' },
      '#ffffff',
    )
    expect(css).toContain('未通过')
  })
})
