import { describe, expect, it } from 'vitest'
import {
  buildNoise,
  colormap,
  describeNoise,
  fbm,
  generateNoiseMap,
  latticeValue,
  parseColormap,
  parseOctaves,
  parseScale,
  parseSeed,
  parseSize,
  smoothstep,
  valueNoise2D,
} from './utils'
import type { NoiseGenOptions } from './schema'

const opts = (o: Partial<NoiseGenOptions> = {}): NoiseGenOptions => ({
  scale: '0.02',
  octaves: '4',
  seed: '42',
  colormap: 'grayscale',
  width: '100',
  height: '80',
  ...o,
})

describe('noise-gen / parse*', () => {
  it('默认值与合法值', () => {
    expect(parseScale('')).toBe(0.02)
    expect(parseScale('0.05')).toBe(0.05)
    expect(parseOctaves('')).toBe(4)
    expect(parseOctaves('6')).toBe(6)
    expect(parseSeed('')).toBeNull()
    expect(parseSeed('123')).toBe(123)
    expect(parseColormap('')).toBe('grayscale')
    expect(parseColormap('viridis')).toBe('viridis')
    expect(parseSize('', '宽', 400)).toBe(400)
  })
  it('越界抛中文错', () => {
    expect(() => parseScale('0.001')).toThrow(/尺度须在 0.005–0.1/)
    expect(() => parseScale('0.5')).toThrow(/尺度须在 0.005–0.1/)
    expect(() => parseOctaves('0')).toThrow(/八度须在 1–8/)
    expect(() => parseOctaves('9')).toThrow(/八度须在 1–8/)
    expect(() => parseSeed('100000')).toThrow(/种子须在 0–99999/)
    expect(() => parseColormap('rainbow')).toThrow(/颜色映射非法/)
  })
})

describe('noise-gen / latticeValue 确定性', () => {
  it('相同格点+种子 → 相同值', () => {
    expect(latticeValue(3, 5, 42)).toBe(latticeValue(3, 5, 42))
  })
  it('不同格点/种子 → 不同值（不必然，但基线在 [0,1)）', () => {
    const v = latticeValue(0, 0, 42)
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
    expect(latticeValue(1, 0, 42)).not.toBe(v)
  })
})

describe('noise-gen / smoothstep & valueNoise2D', () => {
  it('smoothstep 端点为 0/1', () => {
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(1)).toBe(1)
  })
  it('valueNoise2D 输出在 [0,1]', () => {
    for (let i = 0; i < 20; i++) {
      const v = valueNoise2D(i * 0.3, i * 0.7, 42)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('整数格点上等于 latticeValue', () => {
    expect(valueNoise2D(0, 0, 42)).toBe(latticeValue(0, 0, 42))
  })
})

describe('noise-gen / fbm', () => {
  it('输出在 [0,1]', () => {
    for (let i = 0; i < 10; i++) {
      const v = fbm(i * 0.5, i * 0.5, 4, 42)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
  it('相同输入 → 相同输出（确定性）', () => {
    expect(fbm(1.23, 4.56, 4, 42)).toBe(fbm(1.23, 4.56, 4, 42))
  })
  it('八度越多细节越多（基线不崩）', () => {
    expect(typeof fbm(1.23, 4.56, 1, 42)).toBe('number')
    expect(typeof fbm(1.23, 4.56, 8, 42)).toBe('number')
  })
})

describe('noise-gen / colormap', () => {
  it('grayscale 中间值约 128', () => {
    const [r, g, b] = colormap(0.5, 'grayscale')
    expect(r).toBe(g)
    expect(g).toBe(b)
    expect(r).toBeGreaterThanOrEqual(120)
    expect(r).toBeLessThanOrEqual(135)
  })
  it('viridis / plasma 返回 RGB 三元组', () => {
    expect(colormap(0, 'viridis')).toHaveLength(3)
    expect(colormap(1, 'plasma')).toHaveLength(3)
  })
  it('越界值被夹到 [0,1]', () => {
    expect(colormap(-1, 'grayscale')).toEqual([0, 0, 0])
    expect(colormap(2, 'grayscale')).toEqual([255, 255, 255])
  })
})

describe('noise-gen / generateNoiseMap & buildNoise', () => {
  it('返回正确尺寸的数组', () => {
    const map = generateNoiseMap(10, 8, 0.02, 4, 42)
    expect(map).toBeInstanceOf(Float32Array)
    expect(map.length).toBe(80)
  })
  it('相同种子 → 相同噪声图（确定性）', () => {
    const a = generateNoiseMap(10, 8, 0.02, 4, 42)
    const b = generateNoiseMap(10, 8, 0.02, 4, 42)
    expect(Array.from(a)).toEqual(Array.from(b))
  })
  it('buildNoise 解析选项并返回 map', () => {
    const r = buildNoise(opts(), 42)
    expect(r.width).toBe(100)
    expect(r.height).toBe(80)
    expect(r.octaves).toBe(4)
    expect(r.map.length).toBe(8000)
  })
  it('buildNoise 非法尺度抛错', () => {
    expect(() => buildNoise(opts({ scale: '99' }), 42)).toThrow(/尺度须在 0.005–0.1/)
  })
})

describe('noise-gen / describeNoise', () => {
  it('返回含参数的文本', () => {
    const txt = describeNoise(opts(), 42)
    expect(txt).toContain('seed: 42')
    expect(txt).toContain('colormap: grayscale')
    expect(txt).toContain('octaves: 4')
  })
})
