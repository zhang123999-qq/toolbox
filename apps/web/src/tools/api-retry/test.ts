/**
 * api-retry（#760）utils 单测：重试退避时间表计算。
 */
import { describe, expect, it } from 'vitest'
import {
  computeRetrySchedule,
  formatDelay,
  parseRetryConfig,
  totalWaitTime,
  validateRetryOptions,
  type RetryOptions,
} from './utils'

const BASE: RetryOptions = {
  baseDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 8000,
  maxRetries: 4,
  jitter: false,
  strategy: 'exponential',
}

describe('validateRetryOptions', () => {
  it('合法参数通过', () => {
    expect(() => validateRetryOptions(BASE)).not.toThrow()
  })
  it('初始延迟非法抛错', () => {
    expect(() => validateRetryOptions({ ...BASE, baseDelayMs: 0 })).toThrow('初始延迟必须是正整数')
    expect(() => validateRetryOptions({ ...BASE, baseDelayMs: 1.5 })).toThrow(
      '初始延迟必须是正整数',
    )
  })
  it('退避倍数非法抛错', () => {
    expect(() => validateRetryOptions({ ...BASE, multiplier: 0.5 })).toThrow(
      '退避倍数必须是不小于 1',
    )
    expect(() => validateRetryOptions({ ...BASE, multiplier: NaN })).toThrow(
      '退避倍数必须是不小于 1',
    )
  })
  it('最大延迟非法抛错', () => {
    expect(() => validateRetryOptions({ ...BASE, maxDelayMs: 500 })).toThrow(
      '最大延迟必须是不小于初始延迟',
    )
  })
  it('重试次数非法抛错', () => {
    expect(() => validateRetryOptions({ ...BASE, maxRetries: -1 })).toThrow(
      '最大重试次数必须是 0～20 的整数',
    )
    expect(() => validateRetryOptions({ ...BASE, maxRetries: 21 })).toThrow(
      '最大重试次数必须是 0～20 的整数',
    )
    expect(() => validateRetryOptions({ ...BASE, maxRetries: 1.5 })).toThrow(
      '最大重试次数必须是 0～20 的整数',
    )
  })
  it('未知策略抛错', () => {
    expect(() => validateRetryOptions({ ...BASE, strategy: 'x' as never })).toThrow('未知策略')
  })
})

describe('computeRetrySchedule', () => {
  it('指数退避按倍数增长', () => {
    const steps = computeRetrySchedule(BASE)
    expect(steps.map((s) => s.delayMs)).toEqual([1000, 2000, 4000, 8000])
  })
  it('超过上限被截断', () => {
    const steps = computeRetrySchedule({ ...BASE, maxRetries: 6 })
    expect(steps[4].delayMs).toBe(8000)
    expect(steps[5].delayMs).toBe(8000)
  })
  it('线性策略等差递增', () => {
    const steps = computeRetrySchedule({ ...BASE, strategy: 'linear' })
    expect(steps.map((s) => s.delayMs)).toEqual([1000, 2000, 3000, 4000])
  })
  it('固定策略全部相同', () => {
    const steps = computeRetrySchedule({ ...BASE, strategy: 'fixed' })
    expect(steps.map((s) => s.delayMs)).toEqual([1000, 1000, 1000, 1000])
  })
  it('缺省策略为指数退避', () => {
    const { strategy: _s, ...rest } = BASE
    const steps = computeRetrySchedule(rest)
    expect(steps.map((s) => s.delayMs)).toEqual([1000, 2000, 4000, 8000])
  })
  it('抖动给出上下界', () => {
    const steps = computeRetrySchedule({ ...BASE, jitter: true })
    expect(steps[0].minDelayMs).toBe(500)
    expect(steps[0].maxDelayMs).toBe(1500)
    expect(steps[0].delayMs).toBe(1000)
  })
  it('无抖动上下界等于标称值', () => {
    const steps = computeRetrySchedule(BASE)
    expect(steps[0].minDelayMs).toBe(1000)
    expect(steps[0].maxDelayMs).toBe(1000)
  })
  it('累计等待逐次累加', () => {
    const steps = computeRetrySchedule({ ...BASE, strategy: 'fixed', maxRetries: 3 })
    expect(steps.map((s) => s.cumulativeMs)).toEqual([1000, 2000, 3000])
    expect(steps[2].attempt).toBe(3)
  })
  it('重试次数为 0 返回空数组', () => {
    expect(computeRetrySchedule({ ...BASE, maxRetries: 0 })).toEqual([])
  })
})

describe('totalWaitTime', () => {
  it('空表为 0', () => {
    expect(totalWaitTime([])).toBe(0)
  })
  it('返回最后一次累计', () => {
    expect(totalWaitTime(computeRetrySchedule(BASE))).toBe(15000)
  })
})

describe('formatDelay', () => {
  it('毫秒原样', () => {
    expect(formatDelay(500)).toBe('500ms')
  })
  it('整秒', () => {
    expect(formatDelay(2000)).toBe('2s')
  })
  it('小数秒保留一位', () => {
    expect(formatDelay(1500)).toBe('1.5s')
  })
})

describe('parseRetryConfig', () => {
  it('合法 JSON 解析', () => {
    const o = parseRetryConfig(
      '{"baseDelayMs":1000,"multiplier":2,"maxDelayMs":8000,"maxRetries":3,"jitter":true,"strategy":"linear"}',
    )
    expect(o.strategy).toBe('linear')
    expect(o.jitter).toBe(true)
  })
  it('jitter 缺省为 false', () => {
    const o = parseRetryConfig(
      '{"baseDelayMs":1000,"multiplier":2,"maxDelayMs":8000,"maxRetries":3}',
    )
    expect(o.jitter).toBe(false)
    expect(o.strategy).toBeUndefined()
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseRetryConfig('{')).toThrow('配置不是合法 JSON')
  })
  it('非对象抛错', () => {
    expect(() => parseRetryConfig('42')).toThrow('配置必须是 JSON 对象')
  })
  it('非法参数透出校验错', () => {
    expect(() =>
      parseRetryConfig('{"baseDelayMs":0,"multiplier":2,"maxDelayMs":8000,"maxRetries":3}'),
    ).toThrow('初始延迟必须是正整数')
  })
})
