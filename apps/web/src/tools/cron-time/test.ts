import { describe, expect, it } from 'vitest'
import {
  formatRun,
  matches,
  nextRuns,
  normalizeCount,
  parseCron,
  parseField,
  transform,
} from './utils'

/** 固定参照点：2026-09-27（周日）12:00 本地时间 */
const NOW = new Date(2026, 8, 27, 12, 0, 0)

describe('cron-time / parseField', () => {
  it('`*` 展开为整个区间且不限制', () => {
    const f = parseField('*', 0, 59)
    expect(f.values.size).toBe(60)
    expect(f.restricted).toBe(false)
  })

  it('步长 `*/15` 只取 0/15/30/45', () => {
    expect([...parseField('*/15', 0, 59).values]).toEqual([0, 15, 30, 45])
  })

  it('区间 `1-5` 展开为连续整数', () => {
    expect([...parseField('1-5', 0, 59).values]).toEqual([1, 2, 3, 4, 5])
  })

  it('区间步长 `10-30/10` 取 10/20/30', () => {
    expect([...parseField('10-30/10', 0, 59).values]).toEqual([10, 20, 30])
  })

  it('列表 `1,5,3` 按插入序展开', () => {
    expect([...parseField('1,5,3', 0, 59).values]).toEqual([1, 5, 3])
  })

  it('单值带步长 `5/20` 从 5 起到区间末尾', () => {
    expect([...parseField('5/20', 0, 59).values]).toEqual([5, 25, 45])
  })

  it('`?` 与 `*` 等价', () => {
    expect(parseField('?', 1, 31).restricted).toBe(false)
    expect(parseField('?', 1, 31).values.size).toBe(31)
  })

  it('越界 / 非数字 / 零步长都抛中文错误', () => {
    expect(() => parseField('99', 0, 59)).toThrow(/越界/)
    expect(() => parseField('a', 0, 59)).toThrow(/非数字/)
    expect(() => parseField('*/0', 0, 59)).toThrow(/步长必须为正整数/)
    expect(() => parseField('5-3', 0, 59)).toThrow(/越界/)
  })
})

describe('cron-time / parseCron', () => {
  it('周字段 7（周日）归一为 0', () => {
    const c = parseCron('0 0 * * 7')
    expect(c.dow.values.has(0)).toBe(true)
    expect(c.dow.values.has(7)).toBe(false)
  })

  it('段数不为 5 时报错', () => {
    expect(() => parseCron('* * * *')).toThrow(/5 段/)
    expect(() => parseCron('* * * * * *')).toThrow(/5 段/)
  })
})

describe('cron-time / matches（Vixie 日/周 OR 语义）', () => {
  it('日和周都限制时取并集：命中周五或 13 号', () => {
    const runs = nextRuns('0 0 13 * 5', 10, NOW)
    for (const d of runs) {
      const isFriday = d.getDay() === 5
      const is13th = d.getDate() === 13
      expect(isFriday || is13th).toBe(true)
    }
    // 并集确实发生：存在既非 13 号、又是周五的命中
    expect(runs.some((d) => d.getDay() === 5 && d.getDate() !== 13)).toBe(true)
  })

  it('只限制周时，非指定星期不命中', () => {
    const c = parseCron('0 0 * * 1')
    const monday = new Date(2026, 8, 28, 0, 0) // 周一 00:00
    const sunday = new Date(2026, 8, 27, 0, 0) // 周日 00:00
    expect(matches(monday, c)).toBe(true)
    expect(matches(sunday, c)).toBe(false)
  })
})

describe('cron-time / nextRuns', () => {
  it('每分钟：从下一分钟开始', () => {
    expect(formatRun(nextRuns('* * * * *', 1, NOW)[0])).toBe('2026-09-27 12:01:00')
  })

  it('每天 9 点：越过当天 12 点，落在次日 9 点', () => {
    expect(formatRun(nextRuns('0 9 * * *', 1, NOW)[0])).toBe('2026-09-28 09:00:00')
  })

  it('步长每 15 分钟：12:00 之后下一次是 12:15', () => {
    expect(formatRun(nextRuns('*/15 * * * *', 1, NOW)[0])).toBe('2026-09-27 12:15:00')
  })

  it('区间 9-18 点每小时：12 点后下一次是 13 点', () => {
    expect(formatRun(nextRuns('0 9-18 * * *', 1, NOW)[0])).toBe('2026-09-27 13:00:00')
  })

  it('列表 9 点与 18 点：12 点后下一次是当天 18 点', () => {
    expect(formatRun(nextRuns('0 9,18 * * *', 1, NOW)[0])).toBe('2026-09-27 18:00:00')
  })

  it('按 count 返回指定条数且时间递增', () => {
    const runs = nextRuns('* * * * *', 3, NOW)
    expect(runs).toHaveLength(3)
    expect(runs[0].getTime()).toBeLessThan(runs[1].getTime())
    expect(runs[1].getTime()).toBeLessThan(runs[2].getTime())
  })
})

describe('cron-time / normalizeCount & transform', () => {
  it('空 count 回落 5，非法 count 报错', () => {
    expect(normalizeCount('')).toBe(5)
    expect(normalizeCount('3')).toBe(3)
    expect(() => normalizeCount('abc')).toThrow(/正整数/)
    expect(() => normalizeCount('0')).toThrow(/至少为 1/)
    expect(() => normalizeCount('51')).toThrow(/最多为 50/)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, { count: '5' }, NOW)).toBe('')
  })

  it('正常输出带表头与编号', () => {
    const out = transform({ text: '0 9 * * 1-5' }, { count: '3' }, NOW)
    expect(out.startsWith('下次 3 次运行')).toBe(true)
    expect(out).toContain('1. 2026-09-28 09:00:00')
  })

  it('非法表达式进入错误态（抛中文错）', () => {
    expect(() => transform({ text: '99 99 * * *' }, { count: '5' }, NOW)).toThrow(/越界/)
  })

  it('输入超过上限时报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, { count: '5' }, NOW)).toThrow(/上限/)
  })
})
