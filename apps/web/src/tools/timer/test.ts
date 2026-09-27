import { describe, expect, it } from 'vitest'
import {
  breakdown,
  describeDuration,
  formatRemaining,
  nextStatus,
  parseDuration,
  tick,
} from './utils'

describe('timer / parseDuration', () => {
  it('纯秒数', () => {
    expect(parseDuration('90')).toBe(90)
  })

  it('分:秒', () => {
    expect(parseDuration('1:30')).toBe(90)
  })

  it('时:分:秒', () => {
    expect(parseDuration('1:30:00')).toBe(5400)
    expect(parseDuration('0:0:30')).toBe(30)
  })

  it('空串返回 0', () => {
    expect(parseDuration('')).toBe(0)
    expect(parseDuration('   ')).toBe(0)
  })

  it('非法输入抛中文错：非数字 / 段数过多 / 非正', () => {
    expect(() => parseDuration('abc')).toThrow(/非数字/)
    expect(() => parseDuration('1:2:3:4')).toThrow(/段数过多/)
    expect(() => parseDuration('0')).toThrow(/大于 0/)
    expect(() => parseDuration('25:00:00')).toThrow(/24 小时/)
  })
})

describe('timer / breakdown & formatRemaining', () => {
  it('分解总秒数', () => {
    expect(breakdown(3661)).toEqual({ hours: 1, minutes: 1, seconds: 1 })
    expect(breakdown(65)).toEqual({ hours: 0, minutes: 1, seconds: 5 })
  })

  it('不足 1 小时显示 MM:SS，否则 H:MM:SS', () => {
    expect(formatRemaining(65)).toBe('01:05')
    expect(formatRemaining(3661)).toBe('1:01:01')
    expect(formatRemaining(0)).toBe('00:00')
  })
})

describe('timer / tick & nextStatus（状态机）', () => {
  it('tick 递减且不为负', () => {
    expect(tick(10)).toBe(9)
    expect(tick(0)).toBe(0)
  })

  it('running 到 0 转 done，其余状态保持', () => {
    expect(nextStatus('running', 1)).toBe('running')
    expect(nextStatus('running', 0)).toBe('done')
    expect(nextStatus('paused', 0)).toBe('paused')
    expect(nextStatus('idle', 5)).toBe('idle')
  })
})

describe('timer / describeDuration', () => {
  it('空输入返回空串', () => {
    expect(describeDuration('')).toBe('')
  })

  it('汇总为可读文本', () => {
    expect(describeDuration('1:30:00')).toBe('倒计时：1 小时 30 分钟（共 5400 秒）')
    expect(describeDuration('90')).toBe('倒计时：1 分钟 30 秒（共 90 秒）')
  })
})
