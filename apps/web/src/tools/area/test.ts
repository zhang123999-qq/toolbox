import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const M2 = { from: 'm²', to: 'm²' }

describe('area / 精确换算', () => {
  it('1 亩 = 666.6666667 平方米', () => {
    expect(transform({ text: '1' }, { from: '亩', to: 'm²' })).toBe('1 亩 = 666.6666667 m²')
  })

  it('1 公顷 = 10000 平方米', () => {
    expect(transform({ text: '1' }, { from: 'ha', to: 'm²' })).toBe('1 ha = 10000 m²')
  })

  it('1 平方千米 = 1000000 平方米', () => {
    expect(transform({ text: '1' }, { from: 'km²', to: 'm²' })).toBe('1 km² = 1000000 m²')
  })

  it('1 英亩 = 4046.8564224 平方米', () => {
    expect(transform({ text: '1' }, { from: 'acre', to: 'm²' })).toBe('1 acre = 4046.8564224 m²')
  })

  it('1 平方英尺 = 0.09290304 平方米', () => {
    expect(transform({ text: '1' }, { from: 'ft²', to: 'm²' })).toBe('1 ft² = 0.09290304 m²')
  })

  it('反向换算：1 平方米 = 10000 平方厘米', () => {
    expect(transform({ text: '1' }, { from: 'm²', to: 'cm²' })).toBe('1 m² = 10000 cm²')
  })
})

describe('area / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, M2)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, M2)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  2 ' }, { from: 'ha', to: 'm²' })).toBe('2 ha = 20000 m²')
  })

  it('科学计数法输入可用', () => {
    expect(transform({ text: '1e3' }, { from: 'm²', to: 'km²' })).toBe('1e3 m² = 0.001 km²')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 'm²', to: 'ha' })).toBe('0 m² = 0 ha')
    expect(transform({ text: '-1' }, { from: 'km²', to: 'm²' })).toBe('-1 km² = -1000000 m²')
  })
})

describe('area / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, M2)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'm²', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'm²' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, M2)).toThrow(/200,000/)
  })
})

describe('area / fmt 去噪声', () => {
  it('亩→平方米的噪声被清理', () => {
    expect(fmt(666.6666667)).toBe('666.6666667')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual(['cm²', 'm²', 'ha', 'km²', '亩', 'ft²', 'acre'])
  })
})
