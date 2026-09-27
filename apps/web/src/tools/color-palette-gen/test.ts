import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  anchorOffsets,
  generatePalette,
  MAX_COLORS,
  MODES,
  normalizeHue,
  parseBaseColor,
  parseCount,
  parseMode,
  randomBase,
  transform,
} from './utils'
import type { OklchBase } from './utils'

const t = createTranslator('zh')
/** 确定性随机源：恒返回 0 */
const randZero = () => 0
const HEX = /^#[0-9a-f]{6}$/
const BASE: OklchBase = { l: 0.6, c: 0.15, h: 200 }

describe('color-palette-gen / parseBaseColor', () => {
  it('留空返回 null（调用方随机生成基础色）', () => {
    expect(parseBaseColor('', t)).toBeNull()
    expect(parseBaseColor('   ', t)).toBeNull()
  })

  it('解析 #rrggbb，经 culori 转到 Oklch', () => {
    const base = parseBaseColor('#ff0000', t)
    if (base === null) throw new Error('应解析出基础色')
    expect(base.l).toBeGreaterThan(0.5)
    expect(base.c).toBeGreaterThan(0.2)
    expect(base.h).toBeGreaterThan(20)
  })

  it('解析 #rgb 短写与 CSS 颜色名', () => {
    expect(parseBaseColor('#f00', t)).not.toBeNull()
    expect(parseBaseColor('rebeccapurple', t)).not.toBeNull()
  })

  it('无彩色（灰）的 h 为 undefined，回退为 0', () => {
    expect(parseBaseColor('#808080', t)).toMatchObject({ h: 0 })
  })

  it('非法颜色抛双语错误', () => {
    expect(() => parseBaseColor('notacolor', t)).toThrow(/无法解析的颜色/)
    expect(() => parseBaseColor('#zzzzzz', t)).toThrow(/无法解析的颜色/)
  })
})

describe('color-palette-gen / anchorOffsets', () => {
  it('7 种模式锚点正确', () => {
    expect(anchorOffsets('random')).toEqual([0])
    expect(anchorOffsets('monochromatic')).toEqual([0])
    expect(anchorOffsets('analogous')).toEqual([-30, 0, 30])
    expect(anchorOffsets('complementary')).toEqual([0, 180])
    expect(anchorOffsets('triadic')).toEqual([0, 120, 240])
    expect(anchorOffsets('split-complementary')).toEqual([0, 150, 210])
    expect(anchorOffsets('tetradic')).toEqual([0, 90, 180, 270])
  })

  it('MODES 与 anchorOffsets 覆盖一致（防新增模式漏锚点）', () => {
    for (const mode of MODES) expect(anchorOffsets(mode).length).toBeGreaterThan(0)
  })
})

describe('color-palette-gen / normalizeHue', () => {
  it('负角度与超 360° 回绕', () => {
    expect(normalizeHue(-30)).toBe(330)
    expect(normalizeHue(390)).toBe(30)
    expect(normalizeHue(720)).toBe(0)
  })

  it('正常角度不变', () => {
    expect(normalizeHue(200)).toBe(200)
  })
})

describe('color-palette-gen / randomBase', () => {
  it('落在合理区间', () => {
    const base = randomBase(randZero)
    expect(base).toEqual({ l: 0.55, c: 0.1, h: 0 })
    const varied = randomBase(() => 0.5)
    expect(varied.l).toBeGreaterThanOrEqual(0.55)
    expect(varied.l).toBeLessThanOrEqual(0.75)
    expect(varied.c).toBeGreaterThanOrEqual(0.1)
    expect(varied.c).toBeLessThanOrEqual(0.2)
    expect(varied.h).toBeGreaterThanOrEqual(0)
    expect(varied.h).toBeLessThan(360)
  })
})

describe('color-palette-gen / parseMode', () => {
  it('合法模式通过', () => {
    expect(parseMode('triadic', t)).toBe('triadic')
  })

  it('非法模式抛双语错误', () => {
    expect(() => parseMode('nope', t)).toThrow(/未知的配色模式/)
  })
})

describe('color-palette-gen / parseCount', () => {
  it('合法数量', () => {
    expect(parseCount('5', t)).toBe(5)
    expect(parseCount(' 3 ', t)).toBe(3)
    expect(parseCount(String(MAX_COLORS), t)).toBe(MAX_COLORS)
  })

  it('非整数抛错', () => {
    expect(() => parseCount('abc', t)).toThrow(/颜色数量无效/)
    expect(() => parseCount('2.5', t)).toThrow(/颜色数量无效/)
    expect(() => parseCount('', t)).toThrow(/颜色数量无效/)
  })

  it('0 与超上限抛错', () => {
    expect(() => parseCount('0', t)).toThrow(/颜色数量无效/)
    expect(() => parseCount(String(MAX_COLORS + 1), t)).toThrow(/颜色数量无效/)
  })
})

describe('color-palette-gen / generatePalette', () => {
  it('输出指定数量的合法 hex', () => {
    const colors = generatePalette(BASE, 'analogous', 5, randZero)
    expect(colors).toHaveLength(5)
    for (const hex of colors) expect(hex).toMatch(HEX)
  })

  it('单色模式：同色相、明度拉开', () => {
    const colors = generatePalette(BASE, 'monochromatic', 3, randZero)
    expect(colors).toHaveLength(3)
    expect(new Set(colors).size).toBe(3)
    for (const hex of colors) expect(hex).toMatch(HEX)
  })

  it('random 模式：每色随机色相与彩度', () => {
    const colors = generatePalette(BASE, 'random', 4, randZero)
    expect(colors).toHaveLength(4)
    for (const hex of colors) expect(hex).toMatch(HEX)
  })

  it('count = 1 走 position 0.5 分支', () => {
    const colors = generatePalette(BASE, 'triadic', 1, randZero)
    expect(colors).toHaveLength(1)
    expect(colors[0]).toMatch(HEX)
  })

  it('锚点轮转：5 色三角色用到全部 3 个锚点', () => {
    const colors = generatePalette(BASE, 'triadic', 5, randZero)
    expect(colors).toHaveLength(5)
    expect(new Set(colors).size).toBe(5)
  })

  it('默认随机源为 Math.random（不传 rand 也能跑）', () => {
    const colors = generatePalette(BASE, 'complementary', 2)
    expect(colors).toHaveLength(2)
    for (const hex of colors) expect(hex).toMatch(HEX)
  })
})

describe('color-palette-gen / transform', () => {
  const options = { mode: 'analogous', count: '3' }

  it('基础色留空 → 随机基础色，仍输出合法 hex', () => {
    const out = transform({ text: '' }, options, t, randZero)
    expect(out.split('\n')).toHaveLength(3)
    for (const hex of out.split('\n')) expect(hex).toMatch(HEX)
  })

  it('指定基础色生成', () => {
    const out = transform({ text: '#3b82f6' }, options, t, randZero)
    expect(out.split('\n')).toHaveLength(3)
    for (const hex of out.split('\n')) expect(hex).toMatch(HEX)
  })

  it('非法模式 / 数量进入错误态（抛错）', () => {
    expect(() => transform({ text: '' }, { mode: 'nope', count: '3' }, t)).toThrow(/未知的配色模式/)
    expect(() => transform({ text: '' }, { mode: 'analogous', count: '0' }, t)).toThrow(
      /颜色数量无效/,
    )
    expect(() => transform({ text: 'notacolor' }, options, t)).toThrow(/无法解析的颜色/)
  })
})
