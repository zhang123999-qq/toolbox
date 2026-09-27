import { describe, expect, it } from 'vitest'
import type { DateCalcOptions } from './schema'
import {
  addDays,
  addMonths,
  addYears,
  daysInMonth,
  isLeapYear,
  parseDate,
  shiftDate,
  transform,
} from './utils'

const base: DateCalcOptions = { op: 'add', amount: '1', unit: 'year' }

describe('date-calc / 闰年与月末溢出', () => {
  it('闰年 2-29 加 1 年落到平年 → 2-28', () => {
    const d = parseDate('2024-02-29')
    expect(addYears(d, 1)).toEqual(new Date(2025, 1, 28))
  })

  it('闰年 2-29 加 4 年回到闰年 → 仍是 2-29', () => {
    const d = parseDate('2024-02-29')
    expect(addYears(d, 4)).toEqual(new Date(2028, 1, 29))
  })

  it('闰年 2-29 减 1 年 → 2023-02-28', () => {
    const d = parseDate('2024-02-29')
    expect(addYears(d, -1)).toEqual(new Date(2023, 1, 28))
  })

  it('1 月 31 日加 1 月 → 2 月最后一天（平年 28 / 闰年 29）', () => {
    expect(addMonths(parseDate('2023-01-31'), 1)).toEqual(new Date(2023, 1, 28))
    expect(addMonths(parseDate('2024-01-31'), 1)).toEqual(new Date(2024, 1, 29))
  })

  it('3 月 31 日加 1 月 → 4 月 30 日', () => {
    expect(addMonths(parseDate('2024-03-31'), 1)).toEqual(new Date(2024, 3, 30))
  })

  it('月末加 12 月跨年夜', () => {
    expect(addMonths(parseDate('2023-12-31'), 1)).toEqual(new Date(2024, 0, 31))
    expect(addMonths(parseDate('2023-11-30'), 3)).toEqual(new Date(2024, 1, 29))
  })

  it('周/日加减按 7 天与 1 天', () => {
    expect(addDays(parseDate('2024-01-01'), 7)).toEqual(new Date(2024, 0, 8))
    expect(shiftDate(parseDate('2024-01-01'), 'add', 2, 'week')).toEqual(new Date(2024, 0, 15))
  })
})

describe('date-calc / 解析与健壮性', () => {
  it('越界日期中文报错（2 月 30 日、13 月）', () => {
    expect(() => parseDate('2024-02-30')).toThrow(/日期越界/)
    expect(() => parseDate('2024-13-01')).toThrow(/月份越界/)
    expect(() => parseDate('2024-00-10')).toThrow(/月份越界/)
  })

  it('非法格式报错', () => {
    expect(() => parseDate('not-a-date')).toThrow(/无法解析/)
    expect(() => parseDate('')).toThrow(/日期不能为空/)
  })

  it('isLeapYear 世纪年规则', () => {
    expect(isLeapYear(2000)).toBe(true)
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2025)).toBe(false)
  })

  it('daysInMonth 覆盖 2 月', () => {
    expect(daysInMonth(2024, 1)).toBe(29)
    expect(daysInMonth(2023, 1)).toBe(28)
  })
})

describe('date-calc / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('2024-02-29 +1 年输出含结果与回退说明', () => {
    const out = transform({ text: '2024-02-29' }, { ...base, amount: '1', unit: 'year' })
    expect(out).toContain('结果：2025-02-28')
    expect(out).toContain('回退到 2 月 28 日')
  })

  it('减法方向正确', () => {
    const out = transform(
      { text: '2024-03-15' },
      {
        op: 'subtract',
        amount: '10',
        unit: 'day',
      },
    )
    expect(out).toContain('结果：2024-03-05')
  })

  it('数量为负自动反转方向', () => {
    const out = transform({ text: '2024-01-10' }, { ...base, amount: '-3', unit: 'day' })
    expect(out).toContain('结果：2024-01-07')
    expect(out).toContain('方向已自动反转')
  })

  it('非法数量报错', () => {
    expect(() => transform({ text: '2024-01-10' }, { ...base, amount: 'abc' })).toThrow(
      /数量必须是整数/,
    )
  })

  it('输入超过上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
