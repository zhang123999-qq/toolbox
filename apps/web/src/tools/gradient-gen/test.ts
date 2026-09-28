import { describe, expect, it } from 'vitest'
import {
  buildGradient,
  hslToHex,
  hashSeed,
  mulberry32,
  parseAngle,
  parseColorList,
  parseShape,
  parseType,
  randomColors,
  transform,
} from './utils'

const HEX = /^#[0-9a-f]{6}$/

describe('gradient-gen / parseColorList', () => {
  it('留空返回 null（调用方随机）', () => {
    expect(parseColorList('')).toBeNull()
    expect(parseColorList('   \n  \n')).toBeNull()
  })
  it('解析多行 #rrggbb 并转小写', () => {
    expect(parseColorList('#FF5B8A\n#6A5CFF')).toEqual(['#ff5b8a', '#6a5cff'])
  })
  it('非法行抛中文错', () => {
    expect(() => parseColorList('#12345')).toThrow(/颜色格式非法/)
    expect(() => parseColorList('red')).toThrow(/颜色格式非法/)
  })
  it('单色抛错（渐变至少 2 色）', () => {
    expect(() => parseColorList('#3b82f6')).toThrow(/至少需要 2 个颜色/)
  })
})

describe('gradient-gen / randomColors', () => {
  it('返回 2–4 个合法 hex', () => {
    const colors = randomColors(mulberry32(42))
    expect(colors.length).toBeGreaterThanOrEqual(2)
    expect(colors.length).toBeLessThanOrEqual(4)
    for (const c of colors) expect(c).toMatch(HEX)
  })
  it('相同种子 → 相同配色（确定性）', () => {
    expect(randomColors(mulberry32(7))).toEqual(randomColors(mulberry32(7)))
  })
})

describe('gradient-gen / parseType/Angle/Shape', () => {
  it('默认值与合法值', () => {
    expect(parseType('')).toBe('linear')
    expect(parseType('conic')).toBe('conic')
    expect(parseAngle('')).toBe(135)
    expect(parseAngle('90')).toBe(90)
    expect(parseShape('')).toBe('ellipse')
    expect(parseShape('circle')).toBe('circle')
  })
  it('非法值抛中文错', () => {
    expect(() => parseType('diagonal')).toThrow(/渐变类型非法/)
    expect(() => parseAngle('400')).toThrow(/0–360/)
    expect(() => parseAngle('abc')).toThrow(/角度格式非法/)
    expect(() => parseShape('square')).toThrow(/径向形状非法/)
  })
})

describe('gradient-gen / buildGradient', () => {
  const colors = ['#ff0000', '#0000ff']
  it('线性带角度', () => {
    expect(buildGradient(colors, 'linear', 135, 'ellipse')).toBe(
      'linear-gradient(135deg, #ff0000, #0000ff)',
    )
  })
  it('径向带形状', () => {
    expect(buildGradient(colors, 'radial', 0, 'circle')).toBe(
      'radial-gradient(circle, #ff0000, #0000ff)',
    )
  })
  it('锥形固定 from 0deg', () => {
    expect(buildGradient(colors, 'conic', 0, 'ellipse')).toBe(
      'conic-gradient(from 0deg, #ff0000, #0000ff)',
    )
  })
})

describe('gradient-gen / transform', () => {
  it('指定颜色 → 完整 CSS 含 background', () => {
    const out = transform(
      { text: '#ff5b8a\n#6a5cff' },
      { type: 'linear', angle: '135', shape: 'ellipse' },
    )
    expect(out).toContain('.gradient')
    expect(out).toContain('background: linear-gradient(135deg, #ff5b8a, #6a5cff);')
  })
  it('留空 → 随机配色，仍输出合法 CSS', () => {
    const out = transform({ text: '' }, { type: 'radial', angle: '', shape: 'circle' }, 1)
    expect(out).toContain('radial-gradient(circle,')
    expect(out).toContain('background:')
  })
  it('非法输入抛错', () => {
    expect(() => transform({ text: '#bad' }, { type: 'linear', angle: '', shape: '' })).toThrow(
      /颜色格式非法/,
    )
    expect(() =>
      transform({ text: '#a\n#b' }, { type: 'linear', angle: '999', shape: '' }),
    ).toThrow(/0–360/)
  })
  it('hashSeed / mulberry32 基线', () => {
    expect(hashSeed('')).toBe(2166136261)
    expect(hslToHex(0, 100, 50)).toBe('#ff0000')
  })
})
