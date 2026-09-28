import { describe, expect, it } from 'vitest'
import {
  cryptoRandom,
  FORMATS,
  formatColor,
  MAX_COUNT,
  parseCount,
  parseFormat,
  randomColor,
  transform,
} from './utils'

const HEX = /^#[0-9a-f]{6}$/
const RGB = /^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/
const HSL = /^hsl\(\d{1,3}, \d{1,3}%, \d{1,3}%\)$/

describe('random-color / cryptoRandom', () => {
  it('落在 [0,1)', () => {
    for (let i = 0; i < 100; i++) {
      const v = cryptoRandom()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('random-color / parseCount', () => {
  it('空串默认 1', () => {
    expect(parseCount('')).toBe(1)
    expect(parseCount(undefined)).toBe(1)
  })
  it('合法数量', () => {
    expect(parseCount('5')).toBe(5)
    expect(parseCount(' 10 ')).toBe(10)
    expect(parseCount(String(MAX_COUNT))).toBe(MAX_COUNT)
  })
  it('非整数 / 超范围抛中文错', () => {
    expect(() => parseCount('abc')).toThrow(/数量必须为 1 到 50/)
    expect(() => parseCount('0')).toThrow(/数量必须为 1 到 50/)
    expect(() => parseCount(String(MAX_COUNT + 1))).toThrow(/数量必须为 1 到 50/)
  })
})

describe('random-color / parseFormat', () => {
  it('空串默认 hex', () => {
    expect(parseFormat('')).toBe('hex')
  })
  it('合法格式通过', () => {
    for (const f of FORMATS) expect(parseFormat(f)).toBe(f)
  })
  it('非法格式抛中文错', () => {
    expect(() => parseFormat('cmyk')).toThrow(/不支持的颜色格式/)
  })
})

describe('random-color / randomColor + formatColor', () => {
  it('hex 格式输出 #rrggbb', () => {
    const c = randomColor(() => 0.5)
    expect(formatColor(c, 'hex')).toMatch(HEX)
  })
  it('rgb 格式输出 rgb(r,g,b)', () => {
    const c = randomColor(() => 0.5)
    expect(formatColor(c, 'rgb')).toMatch(RGB)
  })
  it('hsl 格式输出整数 hsl()', () => {
    const c = randomColor(() => 0.5)
    expect(formatColor(c, 'hsl')).toMatch(HSL)
  })
})

describe('random-color / transform', () => {
  it('默认输出 1 行 hex', () => {
    const out = transform({ text: '' }, {})
    expect(out.split('\n')).toHaveLength(1)
    expect(out).toMatch(HEX)
  })
  it('count=3 输出 3 行', () => {
    const out = transform({ text: '' }, { count: '3' })
    const lines = out.split('\n')
    expect(lines).toHaveLength(3)
    for (const line of lines) expect(line).toMatch(HEX)
  })
  it('format=hsl 每行匹配 hsl()', () => {
    const out = transform({ text: '' }, { count: '2', format: 'hsl' })
    for (const line of out.split('\n')) expect(line).toMatch(HSL)
  })
  it('非法数量 / 格式抛中文错', () => {
    expect(() => transform({ text: '' }, { count: '0' })).toThrow(/数量必须为 1 到 50/)
    expect(() => transform({ text: '' }, { format: 'nope' })).toThrow(/不支持的颜色格式/)
  })
})
