import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const KG = { from: 'kg', to: 'kg' }

describe('weight / 精确换算', () => {
  it('1 盎司 = 28.349523125 克', () => {
    expect(transform({ text: '1' }, { from: 'oz', to: 'g' })).toBe('1 oz = 28.349523125 g')
  })

  it('1 磅 = 0.45359237 千克', () => {
    expect(transform({ text: '1' }, { from: 'lb', to: 'kg' })).toBe('1 lb = 0.45359237 kg')
  })

  it('1 斤 = 500 克', () => {
    expect(transform({ text: '1' }, { from: '斤', to: 'g' })).toBe('1 斤 = 500 g')
  })

  it('1 吨 = 1000 千克', () => {
    expect(transform({ text: '1' }, { from: 't', to: 'kg' })).toBe('1 t = 1000 kg')
  })

  it('1 毫克 = 0.001 克', () => {
    expect(transform({ text: '1' }, { from: 'mg', to: 'g' })).toBe('1 mg = 0.001 g')
  })

  it('反向换算：1000 克 = 1 千克', () => {
    expect(transform({ text: '1000' }, { from: 'g', to: 'kg' })).toBe('1000 g = 1 kg')
  })
})

describe('weight / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, KG)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, KG)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  2 ' }, { from: 'kg', to: 'g' })).toBe('2 kg = 2000 g')
  })

  it('科学计数法输入可用', () => {
    expect(transform({ text: '1e6' }, { from: 'mg', to: 'kg' })).toBe('1e6 mg = 1 kg')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 'kg', to: 'g' })).toBe('0 kg = 0 g')
    expect(transform({ text: '-1' }, { from: '斤', to: 'g' })).toBe('-1 斤 = -500 g')
  })
})

describe('weight / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: '一公斤' }, KG)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'kg', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'kg' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, KG)).toThrow(/200,000/)
  })
})

describe('weight / fmt 去噪声', () => {
  it('盎司换算的浮点噪声被清理', () => {
    expect(fmt((0.028349523125 / 0.001) * 3)).toBe('85.048569375')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual(['mg', 'g', 'kg', 't', '斤', 'oz', 'lb'])
  })
})
