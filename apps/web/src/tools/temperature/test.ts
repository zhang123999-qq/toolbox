import { describe, expect, it } from 'vitest'
import { fromCelsius, toCelsius, transform } from './utils'

const cf = { from: 'C', to: 'F' }

describe('temperature / 精确换算', () => {
  it('100°C = 212°F', () => {
    expect(transform({ text: '100' }, cf)).toBe('100 C = 212 F')
  })

  it('0°C = 273.15K', () => {
    expect(transform({ text: '0' }, { from: 'C', to: 'K' })).toBe('0 C = 273.15 K')
  })

  it('32°F = 0°C', () => {
    expect(transform({ text: '32' }, { from: 'F', to: 'C' })).toBe('32 F = 0 C')
  })

  it('212°F = 373.15K', () => {
    expect(transform({ text: '212' }, { from: 'F', to: 'K' })).toBe('212 F = 373.15 K')
  })

  it('同单位互转原样输出', () => {
    expect(transform({ text: '-40' }, { from: 'C', to: 'C' })).toBe('-40 C = -40 C')
  })
})

describe('temperature / toCelsius / fromCelsius', () => {
  it('C 直通', () => {
    expect(toCelsius(37, 'C')).toBe(37)
    expect(fromCelsius(37, 'C')).toBe(37)
  })

  it('非法单位抛错', () => {
    expect(() => toCelsius(0, 'X')).toThrow(/未知单位/)
    expect(() => fromCelsius(0, 'X')).toThrow(/未知单位/)
  })
})

describe('temperature / 绝对零度校验', () => {
  it('-273.15°C（绝对零度）通过', () => {
    expect(transform({ text: '-273.15' }, cf)).toContain('-273.15 C = -459.67 F')
  })

  it('-273.16°C 报错', () => {
    expect(() => transform({ text: '-273.16' }, cf)).toThrow(/低于绝对零度，物理上不可能/)
  })

  it('-459.67°F（绝对零度）通过', () => {
    expect(transform({ text: '-459.67' }, { from: 'F', to: 'C' })).toContain('-273.15 C')
  })

  it('-459.68°F 报错', () => {
    expect(() => transform({ text: '-459.68' }, { from: 'F', to: 'C' })).toThrow(
      /低于绝对零度，物理上不可能/,
    )
  })

  it('0K（绝对零度）通过', () => {
    expect(transform({ text: '0' }, { from: 'K', to: 'C' })).toBe('0 K = -273.15 C')
  })

  it('负数开尔文报错', () => {
    expect(() => transform({ text: '-0.1' }, { from: 'K', to: 'C' })).toThrow(
      /低于绝对零度，物理上不可能/,
    )
  })
})

describe('temperature / 异常与边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, cf)).toBe('')
    expect(transform({ text: '   ' }, cf)).toBe('')
  })

  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, cf)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'X', to: 'C' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'C', to: 'X' })).toThrow(/未知单位/)
  })
})
