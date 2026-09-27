import { describe, expect, it } from 'vitest'
import { fmt, transform, UNITS } from './utils'

const HP = { from: 'hp', to: 'kW' }

describe('power / 精确换算', () => {
  it('1 英制马力 = 0.745699872 千瓦', () => {
    expect(transform({ text: '1' }, HP)).toBe('1 hp = 0.745699872 kW')
  })

  it('1 公制马力 = 0.73549875 千瓦', () => {
    expect(transform({ text: '1' }, { from: 'PS', to: 'kW' })).toBe('1 PS = 0.73549875 kW')
  })

  it('1 千瓦 = 1000 瓦', () => {
    expect(transform({ text: '1' }, { from: 'kW', to: 'W' })).toBe('1 kW = 1000 W')
  })

  it('1 BTU/h = 0.29307107017 瓦', () => {
    expect(transform({ text: '1' }, { from: 'BTU/h', to: 'W' })).toBe('1 BTU/h = 0.29307107017 W')
  })

  it('1 千卡/时 = 1.163 瓦', () => {
    expect(transform({ text: '1' }, { from: 'kcal/h', to: 'W' })).toBe('1 kcal/h = 1.163 W')
  })

  it('1 英尺磅/秒 = 1.355817948 瓦', () => {
    expect(transform({ text: '1' }, { from: 'ft·lb/s', to: 'W' })).toBe('1 ft·lb/s = 1.355817948 W')
  })

  it('同单位换算恒等', () => {
    expect(transform({ text: '100' }, { from: 'MW', to: 'MW' })).toBe('100 MW = 100 MW')
  })
})

describe('power / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, HP)).toBe('')
  })

  it('纯空白返回空串', () => {
    expect(transform({ text: '   ' }, HP)).toBe('')
  })

  it('输入首尾空格被修剪', () => {
    expect(transform({ text: '  5 ' }, { from: 'kW', to: 'W' })).toBe('5 kW = 5000 W')
  })

  it('零与负数', () => {
    expect(transform({ text: '0' }, { from: 'W', to: 'hp' })).toBe('0 W = 0 hp')
    expect(transform({ text: '-2' }, { from: 'hp', to: 'W' })).toBe('-2 hp = -1491.399744 W')
  })
})

describe('power / 异常', () => {
  it('非法数字报错', () => {
    expect(() => transform({ text: 'abc' }, HP)).toThrow(/请输入有效的数字/)
  })

  it('未知单位报错', () => {
    expect(() => transform({ text: '1' }, { from: 'hp', to: 'xx' })).toThrow(/未知单位/)
    expect(() => transform({ text: '1' }, { from: 'xx', to: 'hp' })).toThrow(/未知单位/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, HP)).toThrow(/200,000/)
  })
})

describe('power / fmt 去噪声', () => {
  it('浮点噪声被清理', () => {
    expect(fmt(745.699872 / 1000)).toBe('0.745699872')
  })

  it('单位表倍数完整', () => {
    expect(Object.keys(UNITS)).toEqual([
      'W',
      'mW',
      'kW',
      'MW',
      'hp',
      'PS',
      'BTU/h',
      'erg/s',
      'kcal/h',
      'ft·lb/s',
    ])
  })
})
