import { describe, expect, it } from 'vitest'
import { buildCss, normalizeGap, transform } from './utils'
import type { FlexGeneratorOptions } from './schema'

const base: FlexGeneratorOptions = {
  direction: 'row',
  justify: 'center',
  align: 'center',
  wrap: 'wrap',
  gap: '12px',
}

describe('flex-generator / normalizeGap', () => {
  it('空 gap 归一为 0', () => {
    expect(normalizeGap('')).toBe('0')
    expect(normalizeGap('   ')).toBe('0')
  })

  it('接受数字与常见单位', () => {
    expect(normalizeGap('12')).toBe('12')
    expect(normalizeGap('12px')).toBe('12px')
    expect(normalizeGap('1.5rem')).toBe('1.5rem')
  })

  it('非法 gap 抛中文错误', () => {
    expect(() => normalizeGap('abc')).toThrow(/gap 格式非法/)
  })
})

describe('flex-generator / buildCss', () => {
  it('输出完整的 .container 规则', () => {
    const css = buildCss(base)
    expect(css).toContain('.container {')
    expect(css).toContain('display: flex;')
    expect(css).toContain('flex-direction: row;')
    expect(css).toContain('justify-content: center;')
    expect(css).toContain('align-items: center;')
    expect(css).toContain('flex-wrap: wrap;')
    expect(css).toContain('gap: 12px;')
  })

  it('方向切换反映到 CSS', () => {
    expect(buildCss({ ...base, direction: 'column' })).toContain('flex-direction: column;')
  })

  it('非法 gap 时抛错', () => {
    expect(() => buildCss({ ...base, gap: 'xyz' })).toThrow(/gap 格式非法/)
  })
})

describe('flex-generator / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('任意输入触发即输出 CSS', () => {
    expect(transform({ text: 'go' }, base)).toContain('display: flex;')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
