import { describe, expect, it } from 'vitest'
import { calcDue, formatDate, parseDateStrict, transform } from './utils'

const d = (y: number, m: number, day: number): Date => new Date(y, m - 1, day)

describe('due-date / parseDateStrict', () => {
  it('合法日期解析', () => {
    const got = parseDateStrict('2026-01-01')
    expect(got.getFullYear()).toBe(2026)
    expect(got.getMonth()).toBe(0)
    expect(got.getDate()).toBe(1)
  })

  it('首尾空白自动去除', () => {
    expect(parseDateStrict('  2026-01-01  ').getDate()).toBe(1)
  })

  it('闰年 2 月 29 日合法', () => {
    const got = parseDateStrict('2024-02-29')
    expect(got.getMonth()).toBe(1)
    expect(got.getDate()).toBe(29)
  })

  it('平年 2 月 29 日越界', () => {
    expect(() => parseDateStrict('2023-02-29')).toThrow(/日期越界/)
  })

  it('2 月 30 日越界', () => {
    expect(() => parseDateStrict('2026-02-30')).toThrow(/2026 年 2 月没有 30 日/)
  })

  it('月份越界', () => {
    expect(() => parseDateStrict('2026-13-01')).toThrow(/月份越界/)
    expect(() => parseDateStrict('2026-00-10')).toThrow(/月份越界/)
  })

  it('日期越界', () => {
    expect(() => parseDateStrict('2026-01-00')).toThrow(/日期越界/)
    expect(() => parseDateStrict('2026-01-32')).toThrow(/日期越界/)
    expect(() => parseDateStrict('2026-04-31')).toThrow(/日期越界/)
  })

  it('非严格格式拒绝', () => {
    expect(() => parseDateStrict('abc')).toThrow(/无法解析的日期格式/)
    expect(() => parseDateStrict('2026-1-1')).toThrow(/无法解析的日期格式/)
    expect(() => parseDateStrict('2026/01/01')).toThrow(/无法解析的日期格式/)
    expect(() => parseDateStrict('2026-01-01T00:00')).toThrow(/无法解析的日期格式/)
    expect(() => parseDateStrict('')).toThrow(/无法解析的日期格式/)
  })
})

describe('due-date / formatDate', () => {
  it('补零输出 YYYY-MM-DD', () => {
    expect(formatDate(d(2026, 1, 5))).toBe('2026-01-05')
    expect(formatDate(d(2026, 12, 25))).toBe('2026-12-25')
  })
})

describe('due-date / calcDue', () => {
  it('2026-01-01 末次月经，3 月 29 日：12 周 3 天，预产期 2026-10-08，还有 193 天', () => {
    const info = calcDue(d(2026, 1, 1), d(2026, 3, 29))
    expect(formatDate(info.due)).toBe('2026-10-08')
    expect(info.weeks).toBe(12)
    expect(info.days).toBe(3)
    expect(info.daysToDue).toBe(193)
  })

  it('同一天：0 周 0 天，距预产期 280 天', () => {
    const info = calcDue(d(2026, 3, 29), d(2026, 3, 29))
    expect(info.weeks).toBe(0)
    expect(info.days).toBe(0)
    expect(info.daysToDue).toBe(280)
  })

  it('末次月经晚于今天抛错', () => {
    expect(() => calcDue(d(2026, 5, 1), d(2026, 3, 29))).toThrow(/末次月经日期不能晚于今天/)
  })

  it('已过预产期：daysToDue 为负', () => {
    const info = calcDue(d(2025, 1, 1), d(2026, 9, 27))
    expect(formatDate(info.due)).toBe('2025-10-08')
    expect(info.daysToDue).toBe(-354)
  })

  it('输入带时分秒时按日期部分计算', () => {
    const lmp = new Date(2026, 0, 1, 15, 30, 45)
    const now = new Date(2026, 2, 29, 8, 0, 0)
    const info = calcDue(lmp, now)
    expect(info.weeks).toBe(12)
    expect(info.days).toBe(3)
    expect(info.daysToDue).toBe(193)
  })

  it('整周边界：满 7 天进 1 周', () => {
    const info = calcDue(d(2026, 1, 1), d(2026, 1, 8))
    expect(info.weeks).toBe(1)
    expect(info.days).toBe(0)
  })
})

describe('due-date / transform', () => {
  const opts = {}

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts)).toBe('')
    expect(transform({ text: '   ' }, opts)).toBe('')
  })

  it('输入超过 200,000 字符报错', () => {
    expect(() => transform({ text: '1'.repeat(200001) }, opts)).toThrow(/输入超过 200,000 字符上限/)
  })

  it('非法日期抛错', () => {
    expect(() => transform({ text: 'not-a-date' }, opts)).toThrow(/无法解析的日期格式/)
    expect(() => transform({ text: '2026-02-30' }, opts)).toThrow(/日期越界/)
  })

  it('未来日期抛错', () => {
    expect(() => transform({ text: '2999-01-01' }, opts)).toThrow(/末次月经日期不能晚于今天/)
  })

  it('合法输入输出四行格式（日期部分与当天无关，可确定）', () => {
    const text = transform({ text: '2020-01-01' }, opts)
    const lines = text.split('\n')
    expect(lines[0]).toBe('末次月经：2020-01-01')
    expect(lines[1]).toBe('预产期：2020-10-07')
    expect(lines[2]).toMatch(/^当前孕周：\d+ 周 \d 天$/)
    expect(lines[3]).toMatch(/^(距预产期：还有 \d+ 天|已超过预产期 \d+ 天)$/)
  })
})
