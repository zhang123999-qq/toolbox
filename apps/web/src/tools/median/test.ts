import { describe, expect, it } from 'vitest'
import { fmtFixed, formatSorted, medianOf, parseNumbers, transform } from './utils'

const D4 = { decimals: '4' } as const

describe('median / parseNumbers', () => {
  it('多种分隔符混用', () => {
    expect(parseNumbers('3,1 4;2')).toEqual([3, 1, 4, 2])
  })

  it('非法项抛中文错误', () => {
    expect(() => parseNumbers('1,abc')).toThrow(/不是有效数字：abc/)
  })

  it('空内容报错', () => {
    expect(() => parseNumbers('')).toThrow(/没有找到有效数字/)
  })
})

describe('median / medianOf', () => {
  it('奇数个取中间：3 1 2 → 2', () => {
    expect(medianOf([3, 1, 2])).toBe(2)
  })

  it('偶数个取中间两数均值：1 2 3 4 → 2.5', () => {
    expect(medianOf([1, 2, 3, 4])).toBe(2.5)
  })

  it('单个数字', () => {
    expect(medianOf([7])).toBe(7)
  })

  it('空数组报错', () => {
    expect(() => medianOf([])).toThrow(/没有找到有效数字/)
  })
})

describe('median / formatSorted', () => {
  it('短列表全显示', () => {
    expect(formatSorted([3, 1, 2], 4)).toBe('1, 2, 3')
  })

  it('超长列表截断并注明', () => {
    const values = Array.from({ length: 150 }, (_, i) => 150 - i)
    const out = formatSorted(values, 0)
    expect(out).toContain('…')
    expect(out).toContain('共 150 个')
  })
})

describe('median / fmtFixed', () => {
  it('去尾零', () => {
    expect(fmtFixed(2.5, 4)).toBe('2.5')
  })
})

describe('median / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, D4)).toBe('')
  })

  it('示例输出中位数 3.5', () => {
    // 3 1 4 1 5 9 2 6 → 排序 1 1 2 3 4 5 6 9 → (3+4)/2 = 3.5
    const out = transform({ text: '3 1 4 1 5 9 2 6' }, { decimals: '4' })
    expect(out).toContain('个数：8')
    expect(out).toContain('排序后：1, 1, 2, 3, 4, 5, 6, 9')
    expect(out).toContain('中位数：3.5')
  })

  it('小数位数选项生效', () => {
    const out = transform({ text: '1 2 3 4' }, { decimals: '2' })
    expect(out).toContain('中位数：2.5')
  })

  it('非法输入报错', () => {
    expect(() => transform({ text: '1,x' }, { decimals: '4' })).toThrow(/不是有效数字/)
  })
})
