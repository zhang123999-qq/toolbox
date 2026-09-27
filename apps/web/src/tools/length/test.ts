import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const KM = { from: 'm', to: 'km' }

describe('length / 精确换算', () => {
  it('1 英寸 = 2.54 厘米（精确值）', () => {
    expect(transform({ text: '1' }, { from: 'in', to: 'cm' })).toBe('1 in = 2.54 cm')
  })

  it('1 英里 = 1.609344 千米', () => {
    expect(transform({ text: '1' }, { from: 'mi', to: 'km' })).toBe('1 mi = 1.609344 km')
  })

  it('1 海里 = 1.852 千米', () => {
    expect(transform({ text: '1' }, { from: 'nmi', to: 'km' })).toBe('1 nmi = 1.852 km')
  })

  it('1 微米 = 0.001 毫米', () => {
    expect(transform({ text: '1' }, { from: 'μm', to: 'mm' })).toBe('1 μm = 0.001 mm')
  })

  it('1 英尺 = 0.3048 米', () => {
    expect(transform({ text: '1' }, { from: 'ft', to: 'm' })).toBe('1 ft = 0.3048 m')
  })

  it('同单位换算恒等', () => {
    expect(transform({ text: '123.456' }, { from: 'm', to: 'm' })).toBe('123.456 m = 123.456 m')
  })
})

describe('length / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, KM)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, KM)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  100 ' }, KM)).toBe('100 m = 0.1 km')
  })

  it('科学计数法输入可用', () => {
    expect(transform({ text: '1e3' }, KM)).toBe('1e3 m = 1 km')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 'm', to: 'cm' })).toBe('0 m = 0 cm')
    expect(transform({ text: '-5' }, { from: 'km', to: 'm' })).toBe('-5 km = -5000 m')
  })

  it('大数精度：1 米 = 39.3700787402 英寸', () => {
    expect(transform({ text: '1' }, { from: 'm', to: 'in' })).toBe('1 m = 39.3700787402 in')
  })
})

describe('length / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, KM)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'm', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'm' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, KM)).toThrow(/200,000/)
  })
})

describe('length / fmt 去噪声', () => {
  it('0.1+0.2 的浮点噪声被清理', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })

  it('循环小数保留 12 位有效数字', () => {
    expect(fmt(1 / 3)).toBe('0.333333333333')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual(['μm', 'mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi', 'nmi'])
  })
})
