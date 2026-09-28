import { describe, expect, it } from 'vitest'
import { buildLayers, parseColor, parseNum, parseStyle, transform } from './utils'
import type { ShadowGenOptions } from './schema'

const baseOpts = (o: Partial<Record<string, string>> = {}): ShadowGenOptions => ({
  layers: '1',
  offsetX: '0',
  offsetY: '10',
  blur: '20',
  spread: '0',
  color: 'rgba(0,0,0,0.15)',
  style: 'soft',
  ...o,
})

describe('shadow-gen / parseNum', () => {
  it('空值用默认值', () => {
    expect(parseNum('', '层数', 1, 1, 5)).toBe(1)
    expect(parseNum('3', '层数', 1, 1, 5)).toBe(3)
  })
  it('越界/非数字抛错', () => {
    expect(() => parseNum('0', '层数', 1, 1, 5)).toThrow(/须在 1–5/)
    expect(() => parseNum('6', '层数', 1, 1, 5)).toThrow(/须在 1–5/)
    expect(() => parseNum('abc', '模糊半径', 20, 0, 100)).toThrow(/格式非法/)
  })
  it('负偏移在范围内合法', () => {
    expect(parseNum('-30', '水平偏移', 0, -50, 50)).toBe(-30)
  })
})

describe('shadow-gen / parseColor & parseStyle', () => {
  it('空用默认色', () => {
    expect(parseColor('', '阴影颜色', 'rgba(0,0,0,0.15)')).toBe('rgba(0,0,0,0.15)')
  })
  it('合法 HEX/rgba 通过', () => {
    expect(parseColor('#3b82f6', '基础色', '#fff')).toBe('#3b82f6')
    expect(parseColor('rgba(0,0,0,0.2)', '基础色', '#fff')).toBe('rgba(0,0,0,0.2)')
  })
  it('非法颜色抛错', () => {
    expect(() => parseColor('red;--x', '基础色', '#fff')).toThrow(/格式非法/)
  })
  it('样式默认 soft 且可切换', () => {
    expect(parseStyle('')).toBe('soft')
    expect(parseStyle('neon')).toBe('neon')
    expect(() => parseStyle('glow')).toThrow(/阴影样式非法/)
  })
})

describe('shadow-gen / buildLayers', () => {
  it('soft 单层输出标准阴影', () => {
    expect(buildLayers(baseOpts(), null)).toEqual(['0px 10px 20px 0px rgba(0,0,0,0.15)'])
  })
  it('多层偏移/模糊逐层递增', () => {
    const layers = buildLayers(baseOpts({ layers: '3', offsetY: '10', blur: '20' }), null)
    expect(layers).toHaveLength(3)
    expect(layers[0]).toContain('10px 20px')
    expect(layers[1]).toContain('20px 40px')
    expect(layers[2]).toContain('30px 60px')
  })
  it('inset 加 inset 关键字', () => {
    expect(buildLayers(baseOpts({ style: 'inset' }), null)[0]).toContain('inset ')
  })
  it('neon 用发光色且无偏移', () => {
    const layer = buildLayers(baseOpts({ style: 'neon' }), '#00e5ff')[0]
    expect(layer).toContain('#00e5ff')
    expect(layer.startsWith('0px 0px')).toBe(true)
  })
  it('colored 用基础色', () => {
    const layer = buildLayers(baseOpts({ style: 'colored' }), '#ff4d6d')[0]
    expect(layer).toContain('#ff4d6d')
  })
})

describe('shadow-gen / transform', () => {
  it('输出完整 CSS 含 box-shadow', () => {
    const out = transform({ text: '' }, baseOpts())
    expect(out).toContain('.shadow')
    expect(out).toContain('box-shadow: 0px 10px 20px 0px rgba(0,0,0,0.15);')
  })
  it('neon 样式用基础色', () => {
    const out = transform({ text: '#00e5ff' }, baseOpts({ style: 'neon' }))
    expect(out).toContain('#00e5ff')
    expect(out).toContain('box-shadow:')
  })
  it('非法参数抛错', () => {
    expect(() => transform({ text: '' }, baseOpts({ layers: '9' }))).toThrow(/须在 1–5/)
    expect(() => transform({ text: 'bad color' }, baseOpts())).toThrow(/基础色格式非法/)
  })
})
