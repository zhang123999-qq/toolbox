import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const KWH = { from: 'kWh', to: 'MJ' }

describe('energy / 精确换算', () => {
  it('1 千瓦时 = 3.6 兆焦', () => {
    expect(transform({ text: '1' }, KWH)).toBe('1 kWh = 3.6 MJ')
  })

  it('1 千卡 = 4.184 千焦', () => {
    expect(transform({ text: '1' }, { from: 'kcal', to: 'kJ' })).toBe('1 kcal = 4.184 kJ')
  })

  it('1 卡 = 4.184 焦', () => {
    expect(transform({ text: '1' }, { from: 'cal', to: 'J' })).toBe('1 cal = 4.184 J')
  })

  it('1 BTU = 1055.06 焦', () => {
    expect(transform({ text: '1' }, { from: 'BTU', to: 'J' })).toBe('1 BTU = 1055.06 J')
  })

  it('1 电子伏特 = 1.602176634e-19 焦', () => {
    expect(transform({ text: '1' }, { from: 'eV', to: 'J' })).toBe('1 eV = 1.602176634e-19 J')
  })

  it('1 瓦时 = 3600 焦', () => {
    expect(transform({ text: '1' }, { from: 'Wh', to: 'J' })).toBe('1 Wh = 3600 J')
  })

  it('1 英尺磅 = 1.35581794833 焦', () => {
    expect(transform({ text: '1' }, { from: 'ft·lb', to: 'J' })).toBe('1 ft·lb = 1.35581794833 J')
  })

  it('同单位换算恒等', () => {
    expect(transform({ text: '3.5' }, { from: 'kJ', to: 'kJ' })).toBe('3.5 kJ = 3.5 kJ')
  })
})

describe('energy / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, KWH)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, KWH)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  2 ' }, { from: 'kcal', to: 'kJ' })).toBe('2 kcal = 8.368 kJ')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 'J', to: 'cal' })).toBe('0 J = 0 cal')
    expect(transform({ text: '-1' }, { from: 'kWh', to: 'J' })).toBe('-1 kWh = -3600000 J')
  })
})

describe('energy / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, KWH)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'kWh', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'kWh' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, KWH)).toThrow(/200,000/)
  })
})

describe('energy / fmt 去噪声', () => {
  it('3.6e6 / 1e6 的浮点噪声被清理', () => {
    expect(fmt(3.6e6 / 1e6)).toBe('3.6')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual([
      'J',
      'kJ',
      'MJ',
      'cal',
      'kcal',
      'Wh',
      'kWh',
      'eV',
      'BTU',
      'ft·lb',
      'erg',
    ])
  })
})
