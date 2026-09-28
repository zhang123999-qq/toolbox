/**
 * random-map（#792）utils 单测：随机地图生成。
 */
import { describe, expect, it } from 'vitest'
import {
  LAND,
  MOUNTAIN,
  WATER,
  countTerrain,
  generateMap,
  mapToAscii,
  mulberry32,
  parseMapOptions,
  validateMapOptions,
} from './utils'

describe('mulberry32', () => {
  it('相同种子序列相同', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    for (let i = 0; i < 10; i += 1) expect(a()).toBe(b())
  })
  it('不同种子序列不同', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })
  it('输出范围 [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 100; i += 1) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('validateMapOptions', () => {
  it('合法参数通过', () => {
    expect(() => validateMapOptions({ w: 32, h: 24, seed: 123 })).not.toThrow()
  })
  it('尺寸非法报错', () => {
    expect(() => validateMapOptions({ w: 0, h: 8, seed: 1 })).toThrow('w')
    expect(() => validateMapOptions({ w: 8, h: 0, seed: 1 })).toThrow('h')
    expect(() => validateMapOptions({ w: 300, h: 8, seed: 1 })).toThrow('上限')
  })
  it('种子非法报错', () => {
    expect(() => validateMapOptions({ w: 8, h: 8, seed: 1.5 })).toThrow('seed')
  })
  it('比例越界报错', () => {
    expect(() => validateMapOptions({ w: 8, h: 8, seed: 1, waterLevel: 1.5 })).toThrow('waterLevel')
    expect(() => validateMapOptions({ w: 8, h: 8, seed: 1, mountainRate: -0.1 })).toThrow('mountainRate')
  })
  it('非对象报错', () => {
    expect(() => validateMapOptions('x' as never)).toThrow('必须是对象')
    expect(() => validateMapOptions(null as never)).toThrow('必须是对象')
  })
})

describe('generateMap', () => {
  it('相同种子地图相同', () => {
    const a = generateMap({ w: 20, h: 16, seed: 99 })
    const b = generateMap({ w: 20, h: 16, seed: 99 })
    expect(a).toEqual(b)
  })
  it('不同种子地图不同', () => {
    const a = generateMap({ w: 20, h: 16, seed: 1 })
    const b = generateMap({ w: 20, h: 16, seed: 2 })
    expect(a).not.toEqual(b)
  })
  it('尺寸正确且只含合法地形', () => {
    const g = generateMap({ w: 12, h: 10, seed: 5 })
    expect(g).toHaveLength(10)
    expect(g[0]).toHaveLength(12)
    for (const row of g) {
      for (const t of row) expect([WATER, LAND, MOUNTAIN]).toContain(t)
    }
  })
  it('水域比例 1 全为水', () => {
    const g = generateMap({ w: 8, h: 8, seed: 1, waterLevel: 1 })
    expect(g.flat().every((t) => t === WATER)).toBe(true)
  })
  it('水域比例 0 无水（山地除外）', () => {
    const g = generateMap({ w: 8, h: 8, seed: 1, waterLevel: 0, mountainRate: 0 })
    expect(g.flat().every((t) => t === LAND)).toBe(true)
  })
  it('山地概率 1 则陆地全变山地', () => {
    const g = generateMap({ w: 8, h: 8, seed: 1, waterLevel: 0, mountainRate: 1 })
    expect(g.flat().every((t) => t === MOUNTAIN)).toBe(true)
  })
})

describe('mapToAscii', () => {
  it('渲染地形字符', () => {
    expect(
      mapToAscii([
        [WATER, LAND],
        [MOUNTAIN, WATER],
      ]),
    ).toBe('≈·\n▲≈')
  })
  it('空地图报错', () => {
    expect(() => mapToAscii([])).toThrow('不能为空')
  })
  it('行非数组报错', () => {
    expect(() => mapToAscii([1] as never)).toThrow('不是数组')
  })
  it('非法地形值报错', () => {
    expect(() => mapToAscii([[9]])).toThrow('非法地形值')
  })
})

describe('countTerrain', () => {
  it('统计各类地形', () => {
    expect(
      countTerrain([
        [WATER, LAND],
        [MOUNTAIN, WATER],
      ]),
    ).toEqual({ water: 2, land: 1, mountain: 1 })
  })
  it('非法地形值报错', () => {
    expect(() => countTerrain([[5]])).toThrow('非法地形值')
  })
})

describe('parseMapOptions', () => {
  it('解析合法 JSON', () => {
    expect(parseMapOptions('{"w":16,"h":12,"seed":7}')).toEqual({
      w: 16,
      h: 12,
      seed: 7,
      waterLevel: undefined,
      mountainRate: undefined,
    })
  })
  it('非法 JSON 报错', () => {
    expect(() => parseMapOptions('xxx')).toThrow('合法 JSON')
  })
  it('数组报错', () => {
    expect(() => parseMapOptions('[1]')).toThrow('JSON 对象')
  })
})
