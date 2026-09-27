import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  addDays,
  computeDueDate,
  daysInMonth,
  diffDays,
  DueDateError,
  formatDueDate,
  formatYmd,
  localizeError,
  parseCycleDays,
  parseDate,
  todayUtc,
  transform,
} from './utils'

const empty = {}
const zh = createTranslator('zh')
const en = createTranslator('en')

/** 断言抛出指定 key 的 DueDateError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(DueDateError)
    expect((error as DueDateError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

const base = { text: '2026-06-01', cycleLength: '28', textB: '2026-09-27' }

describe('due-date / parseDate', () => {
  it('空输入抛 emptyDate', () => {
    expectKey(() => parseDate('   '), 'dueDate.error.emptyDate')
  })

  it('非法日期字符串抛 invalidDate', () => {
    expectKey(() => parseDate('not-a-date'), 'dueDate.error.invalidDate')
    expectKey(() => parseDate('2026/13'), 'dueDate.error.invalidDate')
  })

  it('月份越界抛 dateOutOfRange', () => {
    expectKey(() => parseDate('2026-13-01'), 'dueDate.error.dateOutOfRange')
    expectKey(() => parseDate('2026-00-10'), 'dueDate.error.dateOutOfRange')
  })

  it('非闰年 2 月 29 日抛 dateOutOfRange', () => {
    expectKey(() => parseDate('2023-02-29'), 'dueDate.error.dateOutOfRange')
  })

  it('日期越界：2 月 30 日', () => {
    expectKey(() => parseDate('2026-02-30'), 'dueDate.error.dateOutOfRange')
  })

  it('闰年 2 月 29 日可解析', () => {
    expect(formatYmd(parseDate('2024-02-29'))).toBe('2024-02-29')
  })

  it('兼容斜杠分隔', () => {
    expect(formatYmd(parseDate('2026/6/1'))).toBe('2026-06-01')
  })

  it('时区边界：解析后格式化往返一致（无本地时区偏移）', () => {
    for (const s of ['2024-02-29', '2026-01-31', '2026-12-31', '2000-02-29']) {
      expect(formatYmd(parseDate(s))).toBe(s)
    }
  })
})

describe('due-date / daysInMonth', () => {
  it('闰年 2 月 29 天，平年 28 天', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2023, 2)).toBe(28)
    expect(daysInMonth(2000, 2)).toBe(29)
    expect(daysInMonth(1900, 2)).toBe(28)
  })

  it('大小月', () => {
    expect(daysInMonth(2026, 1)).toBe(31)
    expect(daysInMonth(2026, 4)).toBe(30)
  })
})

describe('due-date / parseCycleDays', () => {
  it('留空默认 28', () => {
    expect(parseCycleDays('')).toBe(28)
    expect(parseCycleDays('   ')).toBe(28)
  })

  it('非数字抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('abc'), 'dueDate.error.invalidCycle')
    expectKey(() => parseCycleDays('28.5'), 'dueDate.error.invalidCycle')
    expectKey(() => parseCycleDays('+28'), 'dueDate.error.invalidCycle')
  })

  it('负数抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('-5'), 'dueDate.error.invalidCycle')
  })

  it('0 抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('0'), 'dueDate.error.invalidCycle')
  })

  it('Infinity 抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('Infinity'), 'dueDate.error.invalidCycle')
  })

  it('超出安全整数的极大值抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('9'.repeat(20)), 'dueDate.error.invalidCycle')
  })

  it('超出 10–90 天范围抛 cycleOutOfRange', () => {
    expectKey(() => parseCycleDays('5'), 'dueDate.error.cycleOutOfRange')
    expectKey(() => parseCycleDays('999999'), 'dueDate.error.cycleOutOfRange')
  })

  it('边界 10 与 90 合法', () => {
    expect(parseCycleDays('10')).toBe(10)
    expect(parseCycleDays('90')).toBe(90)
  })
})

describe('due-date / computeDueDate', () => {
  it('空输入返回 null（不进入错误态）', () => {
    expect(computeDueDate({ text: '', cycleLength: '', textB: '' }, empty)).toBeNull()
    expect(computeDueDate({ text: '   ', cycleLength: '28', textB: '' }, empty)).toBeNull()
  })

  it('标准 28 天周期：2026-06-01 → 预产期 2027-03-08', () => {
    const r = computeDueDate(base, empty)!
    expect(formatYmd(r.edd)).toBe('2027-03-08')
    expect(r.weeks).toBe(16)
    expect(r.days).toBe(6)
    expect(r.daysLeft).toBe(162)
    expect(r.overdue).toBe(false)
    expect(r.trimester).toBe(2)
    expect(r.adjustmentDays).toBe(0)
  })

  it('闰年 2 月 29 日为末次月经：预产期 2024-12-05', () => {
    const r = computeDueDate({ text: '2024-02-29', cycleLength: '28', textB: '2024-06-01' }, empty)!
    expect(formatYmd(r.edd)).toBe('2024-12-05')
  })

  it('月末日期 2026-01-31：预产期 2026-11-07（跨月无漂移）', () => {
    const r = computeDueDate({ text: '2026-01-31', cycleLength: '28', textB: '2026-02-01' }, empty)!
    expect(formatYmd(r.edd)).toBe('2026-11-07')
  })

  it('短周期 20 天：预产期提前 8 天（2027-02-28）', () => {
    const r = computeDueDate({ text: '2026-06-01', cycleLength: '20', textB: '2026-09-27' }, empty)!
    expect(r.adjustmentDays).toBe(-8)
    expect(formatYmd(r.edd)).toBe('2027-02-28')
  })

  it('长周期 35 天：预产期推后 7 天', () => {
    const r = computeDueDate({ text: '2026-06-01', cycleLength: '35', textB: '2026-09-27' }, empty)!
    expect(r.adjustmentDays).toBe(7)
    expect(formatYmd(r.edd)).toBe('2027-03-15')
  })

  it('参考日期留空=今天（UTC）', () => {
    const r = computeDueDate({ text: '2020-01-01', cycleLength: '28', textB: '' }, empty)!
    expect(formatYmd(r.ref)).toBe(formatYmd(todayUtc()))
    expect(r.weeks).toBeGreaterThan(300)
  })

  it('参考日期早于末次月经抛 refBeforeLmp', () => {
    expectKey(
      () => computeDueDate({ text: '2026-06-01', cycleLength: '28', textB: '2026-05-01' }, empty),
      'dueDate.error.refBeforeLmp',
    )
  })

  it('参考日期 = 末次月经：0 周 0 天', () => {
    const r = computeDueDate({ text: '2026-06-01', cycleLength: '28', textB: '2026-06-01' }, empty)!
    expect(r.weeks).toBe(0)
    expect(r.days).toBe(0)
    expect(r.trimester).toBe(1)
  })

  it('参考日期超过预产期：overdue', () => {
    const r = computeDueDate({ text: '2026-06-01', cycleLength: '28', textB: '2027-04-01' }, empty)!
    expect(r.overdue).toBe(true)
    expect(r.daysLeft).toBe(-24)
  })

  it('孕期阶段分界：13 周孕早期 / 14 周孕中期 / 28 周孕晚期', () => {
    const at = (weeks: number) =>
      computeDueDate(
        {
          text: '2026-01-01',
          cycleLength: '28',
          textB: formatYmd(addDays(parseDate('2026-01-01'), weeks * 7)),
        },
        empty,
      )!
    expect(at(13).trimester).toBe(1)
    expect(at(14).trimester).toBe(2)
    expect(at(27).trimester).toBe(2)
    expect(at(28).trimester).toBe(3)
  })

  it('超长输入抛 tooLong', () => {
    expectKey(
      () => computeDueDate({ text: 'x'.repeat(200001), cycleLength: '28', textB: '' }, empty),
      'dueDate.error.tooLong',
    )
  })
})

describe('due-date / diffDays & addDays', () => {
  it('跨夏令时切换日期差值精确（UTC 无偏移）', () => {
    // 2026-03-08 为北美夏令时切换日，UTC 计算不受影响
    expect(diffDays(parseDate('2026-03-09'), parseDate('2026-03-08'))).toBe(1)
    expect(diffDays(addDays(parseDate('2026-01-01'), 280), parseDate('2026-01-01'))).toBe(280)
  })
})

describe('due-date / formatDueDate', () => {
  it('中文输出关键行', () => {
    const out = formatDueDate(computeDueDate(base, empty)!, zh)
    expect(out).toContain('预产期：2027-03-08')
    expect(out).toContain('当前孕周：孕 16 周 6 天')
    expect(out).toContain('距预产期：还有 162 天')
    expect(out).toContain('孕期阶段：孕中期')
    expect(out).not.toContain('已按')
  })

  it('周期调整时输出调整说明', () => {
    const out = formatDueDate(
      computeDueDate({ text: '2026-06-01', cycleLength: '20', textB: '2026-09-27' }, empty)!,
      zh,
    )
    expect(out).toContain('已按 20 天周期调整 -8 天')
  })

  it('过期输出已超过预产期', () => {
    const out = formatDueDate(
      computeDueDate({ text: '2026-06-01', cycleLength: '28', textB: '2027-04-01' }, empty)!,
      zh,
    )
    expect(out).toContain('距预产期：已超过预产期 24 天')
  })

  it('英文输出', () => {
    const out = formatDueDate(computeDueDate(base, empty)!, en)
    expect(out).toContain('Estimated due date：2027-03-08')
    expect(out).toContain('Gestational age：16 weeks 6 days')
    expect(out).toContain('Second trimester')
  })
})

describe('due-date / localizeError', () => {
  it('DueDateError 走 i18n', () => {
    expect(localizeError(new DueDateError('dueDate.error.emptyDate'), zh)).toBe(
      '请填写末次月经日期',
    )
    expect(localizeError(new DueDateError('dueDate.error.emptyDate'), en)).toBe(
      'Please enter the last menstrual period date',
    )
  })

  it('普通 Error 原样展示 message', () => {
    expect(localizeError(new Error('boom'), zh)).toBe('boom')
  })

  it('非 Error 值转字符串', () => {
    expect(localizeError('oops', zh)).toBe('oops')
  })
})

describe('due-date / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', cycleLength: '', textB: '' }, empty, zh)).toBe('')
  })

  it('显式传入中文 t 输出中文', () => {
    const out = transform(base, empty, zh)
    expect(out).toContain('预产期：2027-03-08')
  })

  it('非法输入抛本地化后的 Error（非 DueDateError）', () => {
    try {
      transform({ text: 'not-a-date', cycleLength: '28', textB: '' }, empty, zh)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error).not.toBeInstanceOf(DueDateError)
      expect((error as Error).message).toContain('无法解析的日期')
      return
    }
    throw new Error('期望抛出，但没有抛出')
  })

  it('英文 t 抛英文错误', () => {
    expect(() => transform({ text: 'abc', cycleLength: '28', textB: '' }, empty, en)).toThrow(
      /Cannot parse date/,
    )
  })
})
