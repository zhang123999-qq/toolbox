import { describe, expect, it } from 'vitest'
import { checkAnswer, levelConfig, newRound, type VisionRound } from './utils'

const rng0 = () => 0
const rngHalf = () => 0.5

describe('眼力测试逻辑', () => {
  it('levelConfig：等级 1 为 3×3 网格、色差 60', () => {
    expect(levelConfig(1)).toEqual({ grid: 3, delta: 60 })
  })

  it('levelConfig：难度递增', () => {
    expect(levelConfig(3)).toEqual({ grid: 4, delta: 44 })
    expect(levelConfig(5)).toEqual({ grid: 5, delta: 28 })
  })

  it('levelConfig：网格封顶 8、色差保底 12', () => {
    expect(levelConfig(11)).toEqual({ grid: 8, delta: 12 })
    expect(levelConfig(99)).toEqual({ grid: 8, delta: 12 })
  })

  it('levelConfig：非法等级抛中文错', () => {
    expect(() => levelConfig(0)).toThrow('等级必须为正整数')
    expect(() => levelConfig(-2)).toThrow('等级必须为正整数')
    expect(() => levelConfig(1.5)).toThrow('等级必须为正整数')
  })

  it('newRound：rng=0 时色差块为第 0 块、色相 0', () => {
    const r = newRound(1, rng0)
    expect(r.oddIndex).toBe(0)
    expect(r.base).toBe('hsl(0, 70%, 55%)')
    expect(r.odd).toBe('hsl(0, 70%, 25%)')
    expect(r.grid).toBe(3)
  })

  it('newRound：rng=0.5 时下标与色相按比例', () => {
    const r = newRound(1, rngHalf)
    expect(r.oddIndex).toBe(4) // floor(0.5*9)
    expect(r.base).toBe('hsl(180, 70%, 55%)')
  })

  it('newRound：默认使用 Math.random', () => {
    const r = newRound(2)
    expect(r.oddIndex).toBeGreaterThanOrEqual(0)
    expect(r.oddIndex).toBeLessThan(r.grid * r.grid)
  })

  it('checkAnswer：命中与未命中', () => {
    const r: VisionRound = { level: 1, grid: 3, oddIndex: 4, base: 'a', odd: 'b' }
    expect(checkAnswer(r, 4)).toBe(true)
    expect(checkAnswer(r, 0)).toBe(false)
  })
})
