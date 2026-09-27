import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const kmh = { from: 'km/h', to: 'm/s' }

describe('speed / 精确换算', () => {
  it('100 km/h = 27.7777777778 m/s', () => {
    expect(transform({ text: '100' }, kmh)).toBe('100 km/h = 27.7777777778 m/s')
  })

  it('1 m/s = 3.6 km/h', () => {
    expect(transform({ text: '1' }, { from: 'm/s', to: 'km/h' })).toBe('1 m/s = 3.6 km/h')
  })

  it('60 mph = 96.56064 km/h', () => {
    expect(transform({ text: '60' }, { from: 'mph', to: 'km/h' })).toBe('60 mph = 96.56064 km/h')
  })

  it('1 knot = 1.8519984 km/h', () => {
    expect(transform({ text: '1' }, { from: 'knot', to: 'km/h' })).toBe('1 knot = 1.8519984 km/h')
  })

  it('1 ft/s = 1.09728 km/h', () => {
    expect(transform({ text: '1' }, { from: 'ft/s', to: 'km/h' })).toBe('1 ft/s = 1.09728 km/h')
  })

  it('同单位互转原样输出', () => {
    expect(transform({ text: '88' }, { from: 'mph', to: 'mph' })).toBe('88 mph = 88 mph')
  })
})

describe('speed / fmt', () => {
  it('去掉浮点尾巴', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })
})

describe('speed / 单位表', () => {
  it('5 个单位全部以 m/s 为基准', () => {
    expect(UNITS['m/s'].factor).toBe(1)
    expect(Object.keys(UNITS)).toHaveLength(5)
  })
})

describe('speed / 异常与边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, kmh)).toBe('')
    expect(transform({ text: '   ' }, kmh)).toBe('')
  })

  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, kmh)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'm/s' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'm/s', to: 'xx' })).toThrow(/未知单位/)
  })
})
