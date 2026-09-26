import { describe, expect, it } from 'vitest'
import { formatDate, nextRuns, parseField, transform } from './utils'

/** 固定起点：2026-09-26（周六）10:00 本地时间 */
const FROM = new Date(2026, 8, 26, 10, 0)

describe('cron-next / parseField', () => {
  it('每 15 分钟命中 :00/:15/:30/:45', () => {
    expect([...parseField('*/15', 0, 59)]).toEqual([0, 15, 30, 45])
  })
})

describe('cron-next / nextRuns', () => {
  it('每 15 分钟：从 10:00 之后下一次是 10:15', () => {
    const runs = nextRuns('*/15 * * * *', 5, FROM)
    expect(runs.map(formatDate)).toEqual([
      '2026-09-26 10:15',
      '2026-09-26 10:30',
      '2026-09-26 10:45',
      '2026-09-26 11:00',
      '2026-09-26 11:15',
    ])
  })

  it('工作日 02:00：周六之后从周一开始', () => {
    const runs = nextRuns('0 2 * * 1-5', 5, FROM)
    expect(runs.map(formatDate)).toEqual([
      '2026-09-28 02:00',
      '2026-09-29 02:00',
      '2026-09-30 02:00',
      '2026-10-01 02:00',
      '2026-10-02 02:00',
    ])
  })

  it('每天 00:00 跨过午夜与日期', () => {
    const runs = nextRuns('0 0 * * *', 2, new Date(2026, 0, 1, 23, 30))
    expect(runs.map(formatDate)).toEqual(['2026-01-02 00:00', '2026-01-03 00:00'])
  })

  it('字段数不对抛错', () => {
    expect(() => nextRuns('0 2 * *', 1, FROM)).toThrow(/5 段/)
  })

  it('越界字段抛错', () => {
    expect(() => nextRuns('0 25 * * *', 1, FROM)).toThrow(/越界/)
  })

  it('日/周都被限制时取并集（Vixie OR 语义）', () => {
    // dom=1（每月1号） 与 dow=1（周一） 都限制：任一命中即触发
    const runs = nextRuns('0 0 1 * 1', 3, FROM)
    expect(runs.map(formatDate)).toEqual([
      '2026-09-28 00:00', // 周一（周命中）
      '2026-10-01 00:00', // 1 号（日命中）
      '2026-10-05 00:00', // 周一（周命中）
    ])
  })

  it('仅限制「日」时只按日过滤（不受周影响）', () => {
    const runs = nextRuns('0 0 15 * *', 1, FROM)
    expect(runs.map(formatDate)).toEqual(['2026-10-15 00:00'])
  })

  it('畸形区间抛错（不被静默误解析）', () => {
    expect(() => nextRuns('0 0 -1 * *', 1, FROM)).toThrow(/非法/)
  })
})

describe('cron-next / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { count: '5' })).toBe('')
  })

  it('非法次数报错', () => {
    expect(() => transform({ text: '0 2 * * *' }, { count: '0' })).toThrow(/次数/)
    expect(() => transform({ text: '0 2 * * *' }, { count: 'abc' })).toThrow(/次数/)
  })

  it('输出带序号的时间列表', () => {
    const out = transform({ text: '*/15 * * * *' }, { count: '2' })
    expect(out).toMatch(/^1\. \d{4}-\d{2}-\d{2} \d{2}:\d{2}\n2\. /)
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, { count: '5' })).toThrow(/上限/)
  })
})
