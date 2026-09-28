/**
 * vibration 工具测试（#866）：vibrate 经参数注入字面 mock。
 */
import { describe, expect, it, vi } from 'vitest'
import { describePattern, PATTERNS, vibrate } from './utils'

describe('vibration · describePattern', () => {
  it('空模式', () => {
    expect(describePattern([])).toBe('空模式')
  })

  it('单个时长', () => {
    expect(describePattern([80])).toBe('震动 80 毫秒')
  })

  it('序列模式', () => {
    expect(describePattern([120, 100, 120])).toBe('震动序列：120/100/120 毫秒')
  })

  it('预设表含 4 种模式且均有中文标签', () => {
    expect(Object.keys(PATTERNS)).toEqual(['short', 'long', 'double', 'sos'])
    for (const p of Object.values(PATTERNS)) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.pattern.length).toBeGreaterThan(0)
    }
  })
})

describe('vibration · vibrate', () => {
  it('nav 为空时抛中文错', () => {
    expect(() => vibrate(null)).toThrow('不支持 Vibration API')
    expect(() => vibrate(undefined)).toThrow('不支持 Vibration API')
  })

  it('无 vibrate 函数时抛中文错', () => {
    expect(() => vibrate({})).toThrow('不支持 Vibration API')
  })

  it('透传 pattern 并返回浏览器结果', () => {
    const seen: Array<number | readonly number[]> = []
    const nav = {
      vibrate: vi.fn((p: number | readonly number[]) => {
        seen.push(p)
        return true
      }),
    }
    expect(vibrate(nav, [80, 80])).toBe(true)
    expect(seen[0]).toEqual([80, 80])
  })

  it('浏览器返回 false 时如实透传', () => {
    const nav = { vibrate: () => false }
    expect(vibrate(nav, 80)).toBe(false)
  })

  it('默认 pattern 为 80', () => {
    const seen: Array<number | readonly number[]> = []
    const nav = {
      vibrate: (p: number | readonly number[]) => {
        seen.push(p)
        return true
      },
    }
    vibrate(nav)
    expect(seen[0]).toBe(80)
  })
})
