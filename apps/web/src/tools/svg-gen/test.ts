import { describe, expect, it } from 'vitest'
import { buildSvg, parseColor, parsePattern, parseSize, parseSpacing, transform } from './utils'
import type { SvgGenOptions } from './schema'

const opts = (o: Partial<Record<string, string>> = {}): SvgGenOptions => ({
  pattern: 'dots',
  width: '400',
  height: '300',
  fgColor: '#333333',
  bgColor: '#ffffff',
  spacing: '20',
  ...o,
})

describe('svg-gen / parse*', () => {
  it('默认值', () => {
    expect(parsePattern('')).toBe('dots')
    expect(parseSize('', '宽度', 400)).toBe(400)
    expect(parseColor('', '前景色', '#333')).toBe('#333')
    expect(parseSpacing('')).toBe(20)
  })
  it('非法值抛错', () => {
    expect(() => parsePattern('zigzag')).toThrow(/图案类型非法/)
    expect(() => parseSize('10', '宽度', 400)).toThrow(/50–2000/)
    expect(() => parseColor('blue', '前景色', '#fff')).toThrow(/前景色格式非法/)
    expect(() => parseSpacing('200')).toThrow(/5–100/)
  })
})

describe('svg-gen / buildSvg 各图案', () => {
  it('点阵输出 circle', () => {
    const out = buildSvg(opts({ pattern: 'dots' }))
    expect(out).toContain('<svg')
    expect(out).toContain('<circle')
  })
  it('条纹输出 line', () => {
    expect(buildSvg(opts({ pattern: 'lines' }))).toContain('<line')
  })
  it('棋盘格输出 rect', () => {
    expect(buildSvg(opts({ pattern: 'checker' }))).toContain('<rect')
  })
  it('波浪输出 path', () => {
    expect(buildSvg(opts({ pattern: 'waves' }))).toContain('<path')
  })
  it('网格输出 line', () => {
    expect(buildSvg(opts({ pattern: 'grid' }))).toContain('<line')
  })
  it('含背景 rect 与尺寸', () => {
    const out = buildSvg(opts({ width: '200', height: '100', bgColor: '#ff0000' }))
    expect(out).toContain('width="200" height="100"')
    expect(out).toContain('viewBox="0 0 200 100"')
    expect(out).toContain('fill="#ff0000"')
  })
})

describe('svg-gen / transform', () => {
  it('返回完整 SVG 字符串', () => {
    const out = transform({ text: '' }, opts())
    expect(out.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(out.trim().endsWith('</svg>')).toBe(true)
  })
  it('非法颜色抛错', () => {
    expect(() => transform({ text: '' }, opts({ fgColor: 'red' }))).toThrow(/前景色格式非法/)
  })
})
