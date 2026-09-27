import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const ATM = { from: 'atm', to: 'kPa' }

describe('pressure / 精确换算', () => {
  it('1 大气压 = 101.325 千帕', () => {
    expect(transform({ text: '1' }, ATM)).toBe('1 atm = 101.325 kPa')
  })

  it('1 巴 = 100 千帕', () => {
    expect(transform({ text: '1' }, { from: 'bar', to: 'kPa' })).toBe('1 bar = 100 kPa')
  })

  it('1 psi = 6.894757 千帕', () => {
    expect(transform({ text: '1' }, { from: 'psi', to: 'kPa' })).toBe('1 psi = 6.894757 kPa')
  })

  it('1 大气压 = 1.01325 巴', () => {
    expect(transform({ text: '1' }, { from: 'atm', to: 'bar' })).toBe('1 atm = 1.01325 bar')
  })

  it('1 兆帕 = 1000 千帕', () => {
    expect(transform({ text: '1' }, { from: 'MPa', to: 'kPa' })).toBe('1 MPa = 1000 kPa')
  })

  it('1 英寸汞柱 = 33.86389 毫巴', () => {
    expect(transform({ text: '1' }, { from: 'inHg', to: 'mbar' })).toBe('1 inHg = 33.86389 mbar')
  })

  it('1 千克力/平方厘米 = 98.0665 千帕', () => {
    expect(transform({ text: '1' }, { from: 'kgf/cm²', to: 'kPa' })).toBe('1 kgf/cm² = 98.0665 kPa')
  })

  it('同单位换算恒等', () => {
    expect(transform({ text: '2.5' }, { from: 'Pa', to: 'Pa' })).toBe('2.5 Pa = 2.5 Pa')
  })
})

describe('pressure / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, ATM)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, ATM)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  1 ' }, { from: 'bar', to: 'Pa' })).toBe('1 bar = 100000 Pa')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 'Pa', to: 'psi' })).toBe('0 Pa = 0 psi')
    expect(transform({ text: '-1' }, { from: 'atm', to: 'kPa' })).toBe('-1 atm = -101.325 kPa')
  })
})

describe('pressure / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, ATM)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'atm', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'atm' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, ATM)).toThrow(/200,000/)
  })
})

describe('pressure / fmt 去噪声', () => {
  it('浮点噪声被清理', () => {
    expect(fmt(101325 / 1000)).toBe('101.325')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual([
      'Pa',
      'kPa',
      'MPa',
      'bar',
      'mbar',
      'psi',
      'atm',
      'mmHg',
      'torr',
      'inHg',
      'kgf/cm²',
    ])
  })
})
