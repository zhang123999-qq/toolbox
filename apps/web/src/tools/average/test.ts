import { describe, expect, it } from 'vitest'
import { averageOf, fmtFixed, parseNumbers, transform } from './utils'
import type { AverageOptions } from './schema'

const D4 = { decimals: '4' } as const

describe('average / parseNumbers', () => {
  it('多种分隔符混用', () => {
    expect(parseNumbers('10 20,30;40，50；60、70')).toEqual([10, 20, 30, 40, 50, 60, 70])
  })

  it('换行分隔', () => {
    expect(parseNumbers('1\n2\n3')).toEqual([1, 2, 3])
  })

  it('非法项抛中文错误', () => {
    expect(() => parseNumbers('1,abc,3')).toThrow(/不是有效数字：abc/)
  })

  it('空内容报错', () => {
    expect(() => parseNumbers(' , ')).toThrow(/没有找到有效数字/)
  })
})

describe('average / fmtFixed', () => {
  it('去尾零', () => {
    expect(fmtFixed(2.5, 4)).toBe('2.5')
    expect(fmtFixed(3, 4)).toBe('3')
    expect(fmtFixed(0.30000000000000004, 4)).toBe('0.3')
  })

  it('按位数四舍五入', () => {
    expect(fmtFixed(2.34567, 2)).toBe('2.35')
    expect(fmtFixed(2.34567, 0)).toBe('2')
  })
})

describe('average / averageOf', () => {
  it('10..50 平均 30', () => {
    expect(averageOf([10, 20, 30, 40, 50])).toMatchObject({
      count: 5,
      sum: 150,
      mean: 30,
      min: 10,
      max: 50,
    })
  })

  it('单个数字', () => {
    expect(averageOf([7])).toMatchObject({ count: 1, mean: 7 })
  })

  it('空数组报错', () => {
    expect(() => averageOf([])).toThrow(/没有找到有效数字/)
  })
})

describe('average / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, D4)).toBe('')
  })

  it('输出五行', () => {
    const out = transform({ text: '10 20 30 40 50' }, { decimals: '4' })
    expect(out).toContain('个数：5')
    expect(out).toContain('总和：150')
    expect(out).toContain('算术平均数：30')
    expect(out).toContain('最小值：10')
    expect(out).toContain('最大值：50')
  })

  it('小数位数选项生效', () => {
    const out = transform({ text: '1 2' }, { decimals: '2' })
    expect(out).toContain('算术平均数：1.5')
  })

  it('非法输入报错', () => {
    expect(() => transform({ text: '1,x' }, { decimals: '4' })).toThrow(/不是有效数字/)
  })
})

describe('average / 边界补齐', () => {
  it('fmtFixed 非有限数直接返回字符串', () => {
    expect(fmtFixed(Infinity, 4)).toBe('Infinity')
    expect(fmtFixed(-Infinity, 2)).toBe('-Infinity')
    expect(fmtFixed(NaN, 4)).toBe('NaN')
  })

  it('averageOf 后出现的更小值更新 min', () => {
    expect(averageOf([5, 1, 9])).toMatchObject({
      count: 3,
      sum: 15,
      mean: 5,
      min: 1,
      max: 9,
    })
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, D4)).toThrow(/超过 200,000 字符上限/)
  })

  it('decimals 缺省时回退到 4', () => {
    const out = transform({ text: '1 2' }, {} as AverageOptions)
    expect(out).toContain('算术平均数：1.5')
  })
})
