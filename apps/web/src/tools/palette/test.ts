import { describe, expect, it } from 'vitest'
import {
  anchorOffsets,
  exportPalette,
  generatePalette,
  MAX_COLORS,
  MODES,
  normalizeHue,
  parseBaseColor,
  parseCount,
  parseFormat,
  parseMode,
  randomBase,
  transform,
} from './utils'
import type { OklchBase } from './utils'

const HEX = /^#[0-9a-f]{6}$/
const randZero = () => 0
const BASE: OklchBase = { l: 0.6, c: 0.15, h: 200 }

describe('palette / parseBaseColor', () => {
  it('留空返回 null', () => {
    expect(parseBaseColor('')).toBeNull()
    expect(parseBaseColor('   ')).toBeNull()
  })
  it('解析 #rrggbb 与 CSS 颜色名', () => {
    expect(parseBaseColor('#ff0000')).not.toBeNull()
    expect(parseBaseColor('rebeccapurple')).not.toBeNull()
  })
  it('非法颜色抛中文错', () => {
    expect(() => parseBaseColor('notacolor')).toThrow(/无法解析的颜色/)
  })
})

describe('palette / anchorOffsets', () => {
  it('7 种模式锚点正确', () => {
    expect(anchorOffsets('analogous')).toEqual([-30, 0, 30])
    expect(anchorOffsets('complementary')).toEqual([0, 180])
    expect(anchorOffsets('triadic')).toEqual([0, 120, 240])
    expect(anchorOffsets('tetradic')).toEqual([0, 90, 180, 270])
  })
  it('MODES 全覆盖', () => {
    for (const m of MODES) expect(anchorOffsets(m).length).toBeGreaterThan(0)
  })
})

describe('palette / normalizeHue', () => {
  it('回绕正确', () => {
    expect(normalizeHue(-30)).toBe(330)
    expect(normalizeHue(390)).toBe(30)
  })
})

describe('palette / randomBase', () => {
  it('落在合理区间', () => {
    const b = randomBase(randZero)
    expect(b).toEqual({ l: 0.55, c: 0.1, h: 0 })
  })
})

describe('palette / parse 选项', () => {
  it('默认值', () => {
    expect(parseMode('')).toBe('random')
    expect(parseCount('')).toBe(5)
    expect(parseFormat('')).toBe('css')
  })
  it('非法值抛中文错', () => {
    expect(() => parseMode('nope')).toThrow(/未知的配色模式/)
    expect(() => parseCount('0')).toThrow(/颜色数量必须为 1 到 20/)
    expect(() => parseFormat('xml')).toThrow(/不支持的导出格式/)
  })
  it('count 上限', () => {
    expect(parseCount(String(MAX_COLORS))).toBe(MAX_COLORS)
    expect(() => parseCount(String(MAX_COLORS + 1))).toThrow(/颜色数量必须为 1 到 20/)
  })
})

describe('palette / generatePalette', () => {
  it('输出指定数量合法 hex', () => {
    const colors = generatePalette(BASE, 'analogous', 5, randZero)
    expect(colors).toHaveLength(5)
    for (const c of colors) expect(c).toMatch(HEX)
  })
  it('monochromatic 同色相', () => {
    const colors = generatePalette(BASE, 'monochromatic', 3, randZero)
    expect(new Set(colors).size).toBe(3)
  })
  it('count=1', () => {
    expect(generatePalette(BASE, 'triadic', 1, randZero)).toHaveLength(1)
  })
})

describe('palette / exportPalette', () => {
  it('css 格式', () => {
    const out = exportPalette(['#111111', '#222222'], 'css')
    expect(out).toContain(':root {')
    expect(out).toContain('--color-1: #111111;')
    expect(out).toContain('--color-2: #222222;')
  })
  it('scss 格式', () => {
    const out = exportPalette(['#111111'], 'scss')
    expect(out).toBe('$color-1: #111111;')
  })
  it('json 格式为数组', () => {
    expect(exportPalette(['#111111', '#222222'], 'json')).toBe('["#111111","#222222"]')
  })
  it('tailwind 格式', () => {
    const out = exportPalette(['#111111'], 'tailwind')
    expect(out).toContain('colors: {')
    expect(out).toContain('palette: {')
    expect(out).toContain("1: '#111111',")
  })
})

describe('palette / transform', () => {
  it('默认 css 输出', () => {
    const out = transform({ text: '#3b82f6' }, {})
    expect(out).toContain(':root {')
  })
  it('json 格式可解析', () => {
    const out = transform({ text: '#3b82f6' }, { count: '3', format: 'json' })
    const arr = JSON.parse(out)
    expect(arr).toHaveLength(3)
  })
  it('非法颜色抛中文错', () => {
    expect(() => transform({ text: 'notacolor' }, {})).toThrow(/无法解析的颜色/)
  })
  it('非法格式抛中文错', () => {
    expect(() => transform({ text: '' }, { format: 'xml' })).toThrow(/不支持的导出格式/)
  })
})
