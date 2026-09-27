import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  computeOvulation,
  daysToOvulationText,
  formatOvulation,
  formatYmd,
  localizeError,
  OvulationError,
  parseCycleDays,
  parseDate,
  phaseLabelKey,
  todayUtc,
  transform,
} from './utils'

const empty = {}
const zh = createTranslator('zh')
const en = createTranslator('en')

/** 断言抛出指定 key 的 OvulationError */
function expectKey(fn: () => unknown, key: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(OvulationError)
    expect((error as OvulationError).key).toBe(key)
    return
  }
  throw new Error('期望抛出 ' + key + '，但没有抛出')
}

const base = { text: '2026-09-01', cycleLength: '28', textB: '2026-09-27' }

describe('ovulation / parseDate', () => {
  it('空输入抛 emptyDate', () => {
    expectKey(() => parseDate(''), 'ovulation.error.emptyDate')
  })

  it('非法日期字符串抛 invalidDate', () => {
    expectKey(() => parseDate('abc'), 'ovulation.error.invalidDate')
  })

  it('月份越界抛 dateOutOfRange', () => {
    expectKey(() => parseDate('2026-13-01'), 'ovulation.error.dateOutOfRange')
  })

  it('非闰年 2 月 29 日抛 dateOutOfRange', () => {
    expectKey(() => parseDate('2023-02-29'), 'ovulation.error.dateOutOfRange')
  })

  it('闰年 2 月 29 日可解析', () => {
    expect(formatYmd(parseDate('2024-02-29'))).toBe('2024-02-29')
  })

  it('时区边界：往返一致', () => {
    for (const s of ['2024-02-29', '2026-01-31', '2026-12-31']) {
      expect(formatYmd(parseDate(s))).toBe(s)
    }
  })
})

describe('ovulation / parseCycleDays', () => {
  it('留空默认 28', () => {
    expect(parseCycleDays('  ')).toBe(28)
  })

  it('非数字抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('abc'), 'ovulation.error.invalidCycle')
    expectKey(() => parseCycleDays('28.5'), 'ovulation.error.invalidCycle')
  })

  it('负数抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('-3'), 'ovulation.error.invalidCycle')
  })

  it('0 抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('0'), 'ovulation.error.invalidCycle')
  })

  it('Infinity 抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('Infinity'), 'ovulation.error.invalidCycle')
  })

  it('超出安全整数的极大值抛 invalidCycle', () => {
    expectKey(() => parseCycleDays('9'.repeat(20)), 'ovulation.error.invalidCycle')
  })

  it('超出 10–90 天抛 cycleOutOfRange', () => {
    expectKey(() => parseCycleDays('9'), 'ovulation.error.cycleOutOfRange')
    expectKey(() => parseCycleDays('999999'), 'ovulation.error.cycleOutOfRange')
  })
})

describe('ovulation / computeOvulation', () => {
  it('空输入返回 null（不进入错误态）', () => {
    expect(computeOvulation({ text: '', cycleLength: '', textB: '' }, empty)).toBeNull()
    expect(computeOvulation({ text: '  ', cycleLength: '28', textB: '' }, empty)).toBeNull()
  })

  it('标准 28 天周期：排卵日 / 易孕期 / 下次月经', () => {
    const r = computeOvulation(base, empty)!
    expect(formatYmd(r.ovulationDate)).toBe('2026-09-15')
    expect(formatYmd(r.fertileStart)).toBe('2026-09-10')
    expect(formatYmd(r.fertileEnd)).toBe('2026-09-16')
    expect(formatYmd(r.nextPeriodDate)).toBe('2026-09-29')
    expect(r.cycleDay).toBe(27)
    expect(r.phase).toBe('luteal')
    expect(r.daysToOvulation).toBe(-12)
    expect(r.abnormalCycle).toBe(false)
  })

  it('35 天周期：排卵日为末次月经 + 21 天', () => {
    const r = computeOvulation(
      { text: '2026-09-01', cycleLength: '35', textB: '2026-09-27' },
      empty,
    )!
    expect(formatYmd(r.ovulationDate)).toBe('2026-09-22')
    expect(formatYmd(r.nextPeriodDate)).toBe('2026-10-06')
  })

  it('短周期 24 天：参考日落在第二周期', () => {
    const r = computeOvulation(
      { text: '2026-09-01', cycleLength: '24', textB: '2026-09-27' },
      empty,
    )!
    expect(formatYmd(r.cycleStart)).toBe('2026-09-25')
    expect(formatYmd(r.ovulationDate)).toBe('2026-10-05')
    expect(formatYmd(r.fertileStart)).toBe('2026-09-30')
    expect(formatYmd(r.fertileEnd)).toBe('2026-10-06')
    expect(formatYmd(r.nextPeriodDate)).toBe('2026-10-19')
  })

  it('闰年 2 月 29 日为末次月经：下次月经 2024-03-28', () => {
    const r = computeOvulation(
      { text: '2024-02-29', cycleLength: '28', textB: '2024-03-10' },
      empty,
    )!
    expect(formatYmd(r.nextPeriodDate)).toBe('2024-03-28')
    expect(formatYmd(r.ovulationDate)).toBe('2024-03-14')
  })

  it('跨多个周期的参考日期落在正确周期', () => {
    const r = computeOvulation(
      { text: '2026-01-01', cycleLength: '30', textB: '2026-09-27' },
      empty,
    )!
    expect(formatYmd(r.cycleStart)).toBe('2026-08-29')
    expect(r.cycleDay).toBe(30)
    expect(formatYmd(r.ovulationDate)).toBe('2026-09-14')
    expect(r.daysToOvulation).toBe(-13)
  })

  it('参考日期留空=今天', () => {
    const r = computeOvulation({ text: '2020-01-01', cycleLength: '28', textB: '' }, empty)!
    expect(formatYmd(r.ref)).toBe(formatYmd(todayUtc()))
  })

  it('参考日期早于末次月经抛 refBeforeLmp', () => {
    expectKey(
      () => computeOvulation({ text: '2026-09-01', cycleLength: '28', textB: '2026-08-01' }, empty),
      'ovulation.error.refBeforeLmp',
    )
  })

  it('超长输入抛 tooLong', () => {
    expectKey(
      () => computeOvulation({ text: 'x'.repeat(200001), cycleLength: '28', textB: '' }, empty),
      'ovulation.error.tooLong',
    )
  })
})

describe('ovulation / 阶段判定', () => {
  const at = (ref: string) =>
    computeOvulation({ text: '2026-09-01', cycleLength: '28', textB: ref }, empty)!

  it('第 1 天为月经期', () => {
    const r = at('2026-09-01')
    expect(r.phase).toBe('menstrual')
    expect(r.cycleDay).toBe(1)
    expect(r.daysToOvulation).toBe(14)
  })

  it('第 8 天为卵泡期', () => {
    expect(at('2026-09-08').phase).toBe('follicular')
  })

  it('易孕期内为易孕期', () => {
    expect(at('2026-09-10').phase).toBe('fertile')
    expect(at('2026-09-16').phase).toBe('fertile')
  })

  it('排卵日当天：距排卵 0 天', () => {
    const r = at('2026-09-15')
    expect(r.daysToOvulation).toBe(0)
    expect(r.phase).toBe('fertile')
  })

  it('排卵后为黄体期', () => {
    expect(at('2026-09-20').phase).toBe('luteal')
  })
})

describe('ovulation / 异常周期提示', () => {
  it('周期 20 天（<21）标记异常', () => {
    const r = computeOvulation(
      { text: '2026-09-01', cycleLength: '20', textB: '2026-09-27' },
      empty,
    )!
    expect(r.abnormalCycle).toBe(true)
    expect(formatOvulation(r, zh)).toContain('超出常规范围')
  })

  it('周期 40 天（>35）标记异常', () => {
    const r = computeOvulation(
      { text: '2026-09-01', cycleLength: '40', textB: '2026-09-27' },
      empty,
    )!
    expect(r.abnormalCycle).toBe(true)
  })

  it('边界 21 / 35 天不标记异常', () => {
    for (const c of ['21', '35']) {
      const r = computeOvulation(
        { text: '2026-09-01', cycleLength: c, textB: '2026-09-27' },
        empty,
      )!
      expect(r.abnormalCycle).toBe(false)
      expect(formatOvulation(r, zh)).not.toContain('超出常规范围')
    }
  })
})

describe('ovulation / daysToOvulationText', () => {
  it('未到 / 今天 / 已过', () => {
    expect(daysToOvulationText(3, zh)).toBe('3 天后')
    expect(daysToOvulationText(0, zh)).toBe('就是今天')
    expect(daysToOvulationText(-5, zh)).toBe('已过去 5 天')
  })

  it('英文', () => {
    expect(daysToOvulationText(3, en)).toBe('in 3 days')
    expect(daysToOvulationText(0, en)).toBe('today')
    expect(daysToOvulationText(-5, en)).toBe('5 days ago')
  })
})

describe('ovulation / phaseLabelKey', () => {
  it('四个阶段都有 key', () => {
    expect(phaseLabelKey('menstrual')).toBe('ovulation.phase.menstrual')
    expect(phaseLabelKey('follicular')).toBe('ovulation.phase.follicular')
    expect(phaseLabelKey('fertile')).toBe('ovulation.phase.fertile')
    expect(phaseLabelKey('luteal')).toBe('ovulation.phase.luteal')
  })
})

describe('ovulation / formatOvulation', () => {
  it('中文输出关键行', () => {
    const out = formatOvulation(computeOvulation(base, empty)!, zh)
    expect(out).toContain('排卵日：2026-09-15')
    expect(out).toContain('易孕期：2026-09-10 ～ 2026-09-16')
    expect(out).toContain('下次月经（预计）：2026-09-29')
    expect(out).toContain('当前阶段：黄体期（第 27 天）')
    expect(out).toContain('距排卵：已过去 12 天')
  })

  it('英文输出', () => {
    const out = formatOvulation(computeOvulation(base, empty)!, en)
    expect(out).toContain('Ovulation day：2026-09-15')
    expect(out).toContain('Luteal phase')
  })
})

describe('ovulation / localizeError', () => {
  it('OvulationError 走 i18n', () => {
    expect(localizeError(new OvulationError('ovulation.error.emptyDate'), zh)).toBe(
      '请填写末次月经日期',
    )
    expect(localizeError(new OvulationError('ovulation.error.emptyDate'), en)).toBe(
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

describe('ovulation / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', cycleLength: '', textB: '' }, empty, zh)).toBe('')
  })

  it('显式传入中文 t 输出中文', () => {
    expect(transform(base, empty, zh)).toContain('排卵日：2026-09-15')
  })

  it('非法输入抛本地化后的 Error', () => {
    expect(() => transform({ text: 'abc', cycleLength: '28', textB: '' }, empty, zh)).toThrow(
      /无法解析的日期/,
    )
    expect(() => transform({ text: 'abc', cycleLength: '28', textB: '' }, empty, en)).toThrow(
      /Cannot parse date/,
    )
  })
})
