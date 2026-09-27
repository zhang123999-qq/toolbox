import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const opt = { from: 'gal', to: 'l' }

describe('volume / 精确换算', () => {
  it('1 美制加仑 = 3.785411784 升', () => {
    expect(transform({ text: '1' }, opt)).toBe('1 gal = 3.785411784 l')
  })

  it('100 毫升 = 0.1 升', () => {
    expect(transform({ text: '100' }, { from: 'ml', to: 'l' })).toBe('100 ml = 0.1 l')
  })

  it('1 立方米 = 1000000 毫升', () => {
    expect(transform({ text: '1' }, { from: 'm3', to: 'ml' })).toBe('1 m3 = 1000000 ml')
  })

  it('1 立方英寸 = 16.387064 毫升', () => {
    expect(transform({ text: '1' }, { from: 'in3', to: 'ml' })).toBe('1 in3 = 16.387064 ml')
  })

  it('1 美制液盎司 = 29.5735295625 毫升', () => {
    expect(transform({ text: '1' }, { from: 'fl-oz', to: 'ml' })).toBe('1 fl-oz = 29.5735295625 ml')
  })

  it('同单位互转原样输出', () => {
    expect(transform({ text: '42.5' }, { from: 'ft3', to: 'ft3' })).toBe('42.5 ft3 = 42.5 ft3')
  })

  it('输入首尾空格被裁掉', () => {
    expect(transform({ text: '  1  ' }, opt)).toBe('1 gal = 3.785411784 l')
  })
})

describe('volume / fmt', () => {
  it('去掉浮点尾巴', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })

  it('12 位有效数字截断', () => {
    expect(fmt(1 / 3)).toBe('0.333333333333')
  })
})

describe('volume / 单位表', () => {
  it('8 个单位全部以升为基准', () => {
    expect(UNITS.l.factor).toBe(1)
    expect(UNITS.m3.factor).toBe(1000)
    expect(Object.keys(UNITS)).toHaveLength(8)
  })
})

describe('volume / 异常与边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opt)).toBe('')
    expect(transform({ text: '   ' }, opt)).toBe('')
  })

  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, opt)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'l' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'l', to: 'xx' })).toThrow(/未知单位/)
  })
})
