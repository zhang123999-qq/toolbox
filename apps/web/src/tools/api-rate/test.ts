/**
 * api-rate（#762）utils 单测：令牌桶 / 滑动窗口限流模拟。
 */
import { describe, expect, it } from 'vitest'
import { parseRateSimInput, simulateSlidingWindow, simulateTokenBucket } from './utils'

describe('simulateTokenBucket', () => {
  it('桶内请求全部放行', () => {
    const r = simulateTokenBucket([0, 0.1, 0.2], { capacity: 3, refillPerSec: 1 })
    expect(r.map((x) => x.allowed)).toEqual([true, true, true])
    // 3→2→1.1→0.2（含 0.1 秒间隔的补充）
    expect(r[2].tokensLeft).toBe(0.2)
  })
  it('桶空后拒绝，补充后放行', () => {
    const r = simulateTokenBucket([0, 0.1, 1.1], { capacity: 1, refillPerSec: 1 })
    expect(r[0].allowed).toBe(true)
    expect(r[1].allowed).toBe(false)
    expect(r[2].allowed).toBe(true)
  })
  it('补充不超过桶容量', () => {
    const r = simulateTokenBucket([0, 100], { capacity: 2, refillPerSec: 10 })
    expect(r[1].tokensLeft).toBe(1)
  })
  it('空请求返回空数组', () => {
    expect(simulateTokenBucket([], { capacity: 2, refillPerSec: 1 })).toEqual([])
  })
  it('桶容量非法抛错', () => {
    expect(() => simulateTokenBucket([0], { capacity: 0, refillPerSec: 1 })).toThrow(
      '桶容量必须是正整数',
    )
    expect(() => simulateTokenBucket([0], { capacity: 1.5, refillPerSec: 1 })).toThrow(
      '桶容量必须是正整数',
    )
  })
  it('补充速率非法抛错', () => {
    expect(() => simulateTokenBucket([0], { capacity: 1, refillPerSec: 0 })).toThrow(
      '补充速率必须是正数',
    )
    expect(() => simulateTokenBucket([0], { capacity: 1, refillPerSec: NaN })).toThrow(
      '补充速率必须是正数',
    )
  })
  it('时间戳非法抛错', () => {
    expect(() => simulateTokenBucket([NaN], { capacity: 1, refillPerSec: 1 })).toThrow(
      '请求时间戳必须是有限数字',
    )
    expect(() => simulateTokenBucket([Infinity], { capacity: 1, refillPerSec: 1 })).toThrow(
      '请求时间戳必须是有限数字',
    )
  })
})

describe('simulateSlidingWindow', () => {
  it('窗口内未超限放行', () => {
    const r = simulateSlidingWindow([0, 1, 2], { limit: 3, windowSec: 10 })
    expect(r.map((x) => x.allowed)).toEqual([true, true, true])
    expect(r[2].countInWindow).toBe(3)
  })
  it('超限拒绝，窗口滑出后放行', () => {
    const r = simulateSlidingWindow([0, 1, 2, 3, 11], { limit: 3, windowSec: 10 })
    expect(r.map((x) => x.allowed)).toEqual([true, true, true, false, true])
    expect(r[3].countInWindow).toBe(3)
  })
  it('被拒绝的不占窗口名额', () => {
    const r = simulateSlidingWindow([0, 0.5, 1, 10.5], { limit: 2, windowSec: 10 })
    // t=1 被拒绝；t=10.5 时窗口内只有 t=0.5（t=0 刚好滑出），放行
    expect(r.map((x) => x.allowed)).toEqual([true, true, false, true])
  })
  it('空请求返回空数组', () => {
    expect(simulateSlidingWindow([], { limit: 2, windowSec: 10 })).toEqual([])
  })
  it('上限非法抛错', () => {
    expect(() => simulateSlidingWindow([0], { limit: 0, windowSec: 10 })).toThrow(
      '窗口上限必须是正整数',
    )
  })
  it('窗口时长非法抛错', () => {
    expect(() => simulateSlidingWindow([0], { limit: 2, windowSec: -1 })).toThrow(
      '窗口时长必须是正数',
    )
  })
  it('时间戳非法抛错', () => {
    expect(() => simulateSlidingWindow([NaN], { limit: 2, windowSec: 10 })).toThrow(
      '请求时间戳必须是有限数字',
    )
  })
})

describe('parseRateSimInput', () => {
  it('合法 JSON 解析', () => {
    const o = parseRateSimInput(
      '{"mode":"sliding-window","requests":[0,1],"capacity":3,"refillPerSec":1,"limit":5,"windowSec":10}',
    )
    expect(o.mode).toBe('sliding-window')
    expect(o.requests).toEqual([0, 1])
  })
  it('mode 非法抛错', () => {
    expect(() => parseRateSimInput('{"mode":"x","requests":[0]}')).toThrow(
      'mode 必须是 token-bucket 或 sliding-window',
    )
  })
  it('requests 非数组抛错', () => {
    expect(() => parseRateSimInput('{"mode":"token-bucket","requests":0}')).toThrow(
      'requests 必须是时间戳数组',
    )
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseRateSimInput('{')).toThrow('输入不是合法 JSON')
  })
  it('非对象抛错', () => {
    expect(() => parseRateSimInput('42')).toThrow('输入必须是 JSON 对象')
  })
})
