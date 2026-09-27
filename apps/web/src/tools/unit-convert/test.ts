import { describe, expect, it } from 'vitest'
import { fmt, transform, UNIT_IDS, UNITS } from './utils'

const KM_TO_M = { from: 'km', to: 'm' }

describe('unit-convert / 各类别精确换算', () => {
  it('长度：1 英里 = 1.609344 千米', () => {
    expect(transform({ text: '1' }, { from: 'mi', to: 'km' })).toBe('1 mi = 1.609344 km')
  })

  it('重量：1 磅 = 0.45359237 千克', () => {
    expect(transform({ text: '1' }, { from: 'lb', to: 'kg' })).toBe('1 lb = 0.45359237 kg')
  })

  it('面积：1 亩 = 666.6666667 平方米', () => {
    expect(transform({ text: '1' }, { from: '亩', to: 'm²' })).toBe('1 亩 = 666.6666667 m²')
  })

  it('体积：1 加仑 = 3.785411784 升', () => {
    expect(transform({ text: '1' }, { from: 'gal', to: 'l' })).toBe('1 gal = 3.785411784 l')
  })

  it('体积：1 立方米 = 1000 升', () => {
    expect(transform({ text: '1' }, { from: 'm³', to: 'l' })).toBe('1 m³ = 1000 l')
  })

  it('速度：100 千米/时 = 27.7777777778 米/秒', () => {
    expect(transform({ text: '100' }, { from: 'km/h', to: 'm/s' })).toBe(
      '100 km/h = 27.7777777778 m/s',
    )
  })

  it('速度：1 节 = 0.514444 米/秒', () => {
    expect(transform({ text: '1' }, { from: 'knot', to: 'm/s' })).toBe('1 knot = 0.514444 m/s')
  })
})

describe('unit-convert / 温度专用公式', () => {
  it('100℃ = 212℉', () => {
    expect(transform({ text: '100' }, { from: 'C', to: 'F' })).toBe('100 C = 212 F')
  })

  it('32℉ = 0℃', () => {
    expect(transform({ text: '32' }, { from: 'F', to: 'C' })).toBe('32 F = 0 C')
  })

  it('0℃ = 273.15K', () => {
    expect(transform({ text: '0' }, { from: 'C', to: 'K' })).toBe('0 C = 273.15 K')
  })

  it('273.15K = 0℃', () => {
    expect(transform({ text: '273.15' }, { from: 'K', to: 'C' })).toBe('273.15 K = 0 C')
  })

  it('℉→K 走摄氏度中转：-40℉ = 233.15K', () => {
    expect(transform({ text: '-40' }, { from: 'F', to: 'K' })).toBe('-40 F = 233.15 K')
  })

  it('绝对零度边界：-273.15℃ 可换算', () => {
    expect(transform({ text: '-273.15' }, { from: 'C', to: 'K' })).toBe('-273.15 C = 0 K')
  })

  it('低于绝对零度：-274℃ 报错', () => {
    expect(() => transform({ text: '-274' }, { from: 'C', to: 'F' })).toThrow(/低于绝对零度/)
  })

  it('低于绝对零度：-500℉ 报错', () => {
    expect(() => transform({ text: '-500' }, { from: 'F', to: 'C' })).toThrow(/低于绝对零度/)
  })

  it('低于绝对零度：负开尔文报错', () => {
    expect(() => transform({ text: '-1' }, { from: 'K', to: 'C' })).toThrow(/低于绝对零度/)
  })
})

describe('unit-convert / 边界与异常', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, KM_TO_M)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  1 ' }, KM_TO_M)).toBe('1 km = 1000 m')
  })

  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, KM_TO_M)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'm', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'm' })).toThrow(/未知单位/)
  })

  it('类别不一致：长度不能换算为重量', () => {
    expect(() => transform({ text: '1' }, { from: 'm', to: 'kg' })).toThrow(
      /单位类别不一致：长度单位不能换算为重量单位/,
    )
  })

  it('类别不一致：温度不能换算为速度', () => {
    expect(() => transform({ text: '100' }, { from: 'C', to: 'km/h' })).toThrow(/单位类别不一致/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, KM_TO_M)).toThrow(/200,000/)
  })
})

describe('unit-convert / fmt 与单位表', () => {
  it('浮点噪声被清理', () => {
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })

  it('单位 id 全覆盖六个类别', () => {
    expect(UNIT_IDS.length).toBe(Object.keys(UNITS).length + 3) // 温度 C/F/K 不在 UNITS
    expect(UNIT_IDS.slice(-3)).toEqual(['C', 'F', 'K'])
    expect(UNIT_IDS).toContain('km/h')
    expect(UNIT_IDS).toContain('fl-oz')
    expect(UNIT_IDS).toContain('亩')
    expect(UNIT_IDS).toContain('斤')
  })
})
