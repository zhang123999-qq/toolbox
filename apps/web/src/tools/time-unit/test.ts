import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const HOUR = { from: 'h', to: 'min' }

describe('time-unit / 精确换算', () => {
  it('1 小时 = 60 分钟', () => {
    expect(transform({ text: '1' }, HOUR)).toBe('1 h = 60 min')
  })

  it('1 天 = 86400 秒', () => {
    expect(transform({ text: '1' }, { from: 'day', to: 's' })).toBe('1 day = 86400 s')
  })

  it('1 周 = 7 天', () => {
    expect(transform({ text: '1' }, { from: 'week', to: 'day' })).toBe('1 week = 7 day')
  })

  it('1 分钟 = 60000 毫秒', () => {
    expect(transform({ text: '1' }, { from: 'min', to: 'ms' })).toBe('1 min = 60000 ms')
  })

  it('1 毫秒 = 1000 微秒', () => {
    expect(transform({ text: '1' }, { from: 'ms', to: 'μs' })).toBe('1 ms = 1000 μs')
  })

  it('1 年 = 365.25 天（回归年）', () => {
    expect(transform({ text: '1' }, { from: 'year', to: 'day' })).toBe('1 year = 365.25 day')
  })

  it('1 平均月 = 30.4375 天', () => {
    expect(transform({ text: '1' }, { from: 'month', to: 'day' })).toBe('1 month = 30.4375 day')
  })

  it('同单位换算恒等', () => {
    expect(transform({ text: '24' }, { from: 'h', to: 'h' })).toBe('24 h = 24 h')
  })
})

describe('time-unit / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, HOUR)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, HOUR)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  2 ' }, { from: 'day', to: 'h' })).toBe('2 day = 48 h')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 's', to: 'ms' })).toBe('0 s = 0 ms')
    expect(transform({ text: '-1' }, { from: 'h', to: 's' })).toBe('-1 h = -3600 s')
  })
})

describe('time-unit / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, HOUR)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'h', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'h' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, HOUR)).toThrow(/200,000/)
  })
})

describe('time-unit / fmt 去噪声', () => {
  it('浮点噪声被清理', () => {
    expect(fmt(31557600 / 86400)).toBe('365.25')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual([
      'ns',
      'μs',
      'ms',
      's',
      'min',
      'h',
      'day',
      'week',
      'month',
      'year',
    ])
  })
})
