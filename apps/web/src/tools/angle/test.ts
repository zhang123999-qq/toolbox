import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const DEG = { from: 'deg', to: 'rad' }

describe('angle / 精确换算', () => {
  it('180 度 = π 弧度', () => {
    expect(transform({ text: '180' }, DEG)).toBe('180 deg = 3.14159265359 rad')
  })

  it('1 弧度 = 57.2957795131 度', () => {
    expect(transform({ text: '1' }, { from: 'rad', to: 'deg' })).toBe('1 rad = 57.2957795131 deg')
  })

  it('1 圈 = 360 度', () => {
    expect(transform({ text: '1' }, { from: 'turn', to: 'deg' })).toBe('1 turn = 360 deg')
  })

  it('90 度 = 100 梯度', () => {
    expect(transform({ text: '90' }, { from: 'deg', to: 'grad' })).toBe('90 deg = 100 grad')
  })

  it('1 角分 = 60 角秒', () => {
    expect(transform({ text: '1' }, { from: 'arcmin', to: 'arcsec' })).toBe('1 arcmin = 60 arcsec')
  })

  it('1 密位 = 0.05625 度', () => {
    expect(transform({ text: '1' }, { from: 'mil', to: 'deg' })).toBe('1 mil = 0.05625 deg')
  })

  it('同单位换算恒等', () => {
    expect(transform({ text: '45' }, { from: 'deg', to: 'deg' })).toBe('45 deg = 45 deg')
  })
})

describe('angle / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, DEG)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, DEG)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  360 ' }, { from: 'deg', to: 'turn' })).toBe('360 deg = 1 turn')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, DEG)).toBe('0 deg = 0 rad')
    expect(transform({ text: '-90' }, { from: 'deg', to: 'grad' })).toBe('-90 deg = -100 grad')
  })
})

describe('angle / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, DEG)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'deg', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'deg' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, DEG)).toThrow(/200,000/)
  })
})

describe('angle / fmt 去噪声', () => {
  it('π 的浮点噪声被清理', () => {
    expect(fmt(180 / (180 / Math.PI))).toBe('3.14159265359')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual(['deg', 'rad', 'grad', 'turn', 'arcmin', 'arcsec', 'mil'])
  })
})
