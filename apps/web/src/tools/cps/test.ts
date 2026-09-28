import { describe, expect, it } from 'vitest'
import {
  calcCps,
  calcStats,
  createCpsSession,
  gradeCps,
  recordClick,
  type CpsSession,
} from './utils'

function sessionWith(clicks: number[], durationMs = 5000): CpsSession {
  let s = createCpsSession(durationMs)
  for (const t of clicks) s = recordClick(s, t)
  return s
}

describe('手速测试逻辑', () => {
  it('createCpsSession：新建空会话', () => {
    expect(createCpsSession(5000)).toEqual({ clicks: [], durationMs: 5000 })
  })

  it('createCpsSession：非法时长抛中文错', () => {
    expect(() => createCpsSession(0)).toThrow('测试时长必须为正数')
    expect(() => createCpsSession(-100)).toThrow('测试时长必须为正数')
    expect(() => createCpsSession(Number.NaN)).toThrow('测试时长必须为正数')
  })

  it('recordClick：追加时间戳且不修改原会话', () => {
    const s = createCpsSession(5000)
    const s2 = recordClick(s, 100)
    expect(s.clicks).toEqual([])
    expect(s2.clicks).toEqual([100])
  })

  it('calcCps：空会话为 0', () => {
    expect(calcCps(createCpsSession(5000))).toBe(0)
  })

  it('calcCps：5 秒 25 次 = 5 CPS', () => {
    const clicks = Array.from({ length: 25 }, (_, i) => i * 200)
    expect(calcCps(sessionWith(clicks))).toBe(5)
  })

  it('calcStats：单次点击无间隔统计', () => {
    const stats = calcStats(sessionWith([100]))
    expect(stats).toEqual({ cps: 0.2, total: 1, avgIntervalMs: 0, maxBurst: 1 })
  })

  it('calcStats：空会话', () => {
    const stats = calcStats(createCpsSession(5000))
    expect(stats).toEqual({ cps: 0, total: 0, avgIntervalMs: 0, maxBurst: 0 })
  })

  it('calcStats：平均间隔与最高连击', () => {
    // 0,100,200 连击 3 次；停 2000ms；再连击 2 次
    const stats = calcStats(sessionWith([0, 100, 200, 2200, 2300]))
    expect(stats.total).toBe(5)
    expect(stats.avgIntervalMs).toBe(Math.round(2300 / 4))
    expect(stats.maxBurst).toBe(3)
  })

  it('calcStats：全部连击时 maxBurst 等于总数', () => {
    const stats = calcStats(sessionWith([0, 100, 200, 300]))
    expect(stats.maxBurst).toBe(4)
  })

  it('gradeCps：各档评级', () => {
    expect(gradeCps(9)).toBe('职业级')
    expect(gradeCps(8)).toBe('职业级')
    expect(gradeCps(7)).toBe('高手')
    expect(gradeCps(6)).toBe('高手')
    expect(gradeCps(5)).toBe('熟练')
    expect(gradeCps(4)).toBe('熟练')
    expect(gradeCps(3)).toBe('普通')
    expect(gradeCps(2)).toBe('普通')
    expect(gradeCps(1)).toBe('手速偏慢')
    expect(gradeCps(0)).toBe('手速偏慢')
  })
})
