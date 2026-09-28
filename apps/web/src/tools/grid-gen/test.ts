import { describe, expect, it } from 'vitest'
import { buildGridSvg, parseHex, parsePattern, parseSize, parseSpacing, transform } from './utils'
import type { GridGenOptions } from './schema'

const opts = (o: Partial<GridGenOptions> = {}): GridGenOptions => ({
  pattern: 'dots',
  spacing: '30',
  width: '400',
  height: '300',
  fgColor: '#e5e7eb',
  bgColor: '#ffffff',
  ...o,
})

describe('grid-gen / parse*', () => {
  it('默认值与合法值', () => {
    expect(parsePattern('')).toBe('dots')
    expect(parsePattern('lines')).toBe('lines')
    expect(parsePattern('diagonal')).toBe('diagonal')
    expect(parseSpacing('')).toBe(30)
    expect(parseSpacing('20')).toBe(20)
    expect(parseSize('', '宽', 400)).toBe(400)
    expect(parseSize('500', '宽', 400)).toBe(500)
  })
  it('非法图案抛错', () => {
    expect(() => parsePattern('cross')).toThrow(/图案类型非法/)
  })
  it('间距越界抛错', () => {
    expect(() => parseSpacing('1')).toThrow(/间距须在 5–100/)
    expect(() => parseSpacing('200')).toThrow(/间距须在 5–100/)
  })
  it('尺寸越界抛错', () => {
    expect(() => parseSize('0', '宽', 400)).toThrow(/宽须在 1–2000/)
    expect(() => parseSize('9999', '高', 300)).toThrow(/高须在 1–2000/)
  })
})

describe('grid-gen / parseHex', () => {
  it('合法 hex 归一化', () => {
    expect(parseHex('#FFF', '色')).toBe('#ffffff')
  })
  it('非法 hex 抛错', () => {
    expect(() => parseHex('blue', '色')).toThrow(/色格式非法/)
  })
})

describe('grid-gen / buildGridSvg', () => {
  it('dots 图案生成 circle', () => {
    const out = buildGridSvg(opts({ pattern: 'dots' }))
    expect(out).toContain('<svg')
    expect(out).toContain('<circle')
    expect(out).toContain('fill="#ffffff"')
  })
  it('lines 图案生成 line', () => {
    const out = buildGridSvg(opts({ pattern: 'lines' }))
    expect(out).toContain('<line')
    expect(out).toContain('stroke="#e5e7eb"')
  })
  it('diagonal 图案生成斜向 line', () => {
    const out = buildGridSvg(opts({ pattern: 'diagonal' }))
    expect(out).toContain('<line')
  })
  it('非法颜色抛错', () => {
    expect(() => buildGridSvg(opts({ fgColor: 'red' }))).toThrow(/前景色格式非法/)
  })
  it('非法间距抛错', () => {
    expect(() => buildGridSvg(opts({ spacing: '0' }))).toThrow(/间距须在 5–100/)
  })
})

describe('grid-gen / transform', () => {
  it('返回完整 SVG', () => {
    const out = transform({ text: '' }, opts())
    expect(out).toContain('<svg')
    expect(out.trim().endsWith('</svg>')).toBe(true)
  })
  it('相同选项结果一致（确定性）', () => {
    expect(transform({ text: '' }, opts())).toBe(transform({ text: '' }, opts()))
  })
})
