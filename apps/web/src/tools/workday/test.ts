import { describe, expect, it } from 'vitest'
import type { WorkdayOptions } from './schema'
import { addWorkdays, fmt, isWeekday, parseDate, parseInput, transform } from './utils'

const add: WorkdayOptions = { direction: 'add' }
const sub: WorkdayOptions = { direction: 'subtract' }

function d(s: string): number {
  return parseDate(s)
}

describe('workday / 周末判定', () => {
  it('2025-01-27 是周一，2025-02-01 周六、02-02 周日', () => {
    expect(isWeekday(d('2025-01-27'))).toBe(true)
    expect(isWeekday(d('2025-02-01'))).toBe(false)
    expect(isWeekday(d('2025-02-02'))).toBe(false)
  })

  it('非法日期抛中文错误', () => {
    expect(() => parseDate('2025-02-30')).toThrow(/非法日期/)
    expect(() => parseDate('abc')).toThrow(/无法识别/)
  })
})

describe('workday / addWorkdays（跨周末）', () => {
  it('周一加 1 个工作日 = 周二', () => {
    expect(fmt(addWorkdays(d('2025-01-27'), 1, 'add', new Set()))).toBe('2025-01-28')
  })

  it('周五加 1 个工作日跨周末到下周一', () => {
    expect(fmt(addWorkdays(d('2025-01-31'), 1, 'add', new Set()))).toBe('2025-02-03')
  })

  it('跨年：2024-12-31 加 1 = 2025-01-01', () => {
    expect(fmt(addWorkdays(d('2024-12-31'), 1, 'add', new Set()))).toBe('2025-01-01')
  })

  it('周一减 1 个工作日 = 上周五', () => {
    expect(fmt(addWorkdays(d('2025-01-27'), 1, 'subtract', new Set()))).toBe('2025-01-24')
  })

  it('自定义排除日被跳过', () => {
    const ex = new Set(['2025-01-28'])
    expect(fmt(addWorkdays(d('2025-01-27'), 1, 'add', ex))).toBe('2025-01-29')
  })

  it('排除日落在周末不影响', () => {
    const ex = new Set(['2025-02-01'])
    expect(fmt(addWorkdays(d('2025-01-31'), 1, 'add', ex))).toBe('2025-02-03')
  })
})

describe('workday / parseInput', () => {
  it('解析开始日 + 天数 + 排除日', () => {
    const r = parseInput('2025-01-27\n3\n2025-02-03\n')
    expect(fmt(r.start)).toBe('2025-01-27')
    expect(r.count).toBe(3)
    expect(r.excluded.has('2025-02-03')).toBe(true)
  })

  it('行数不足抛错', () => {
    expect(() => parseInput('2025-01-27')).toThrow(/至少/)
  })
})

describe('workday / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, add)).toBe('')
  })

  it('正常输出三段', () => {
    const out = transform({ text: '2025-01-27\n1' }, add)
    expect(out).toContain('开始日期：2025-01-27')
    expect(out).toContain('结果日期：2025-01-28')
  })

  it('减法方向', () => {
    const out = transform({ text: '2025-01-27\n1' }, sub)
    expect(out).toContain('结果日期：2025-01-24')
  })

  it('非法输入进入错误', () => {
    expect(() => transform({ text: '2025-13-01\n1' }, add)).toThrow(/非法日期/)
  })

  it('超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, add)).toThrow(/上限/)
  })
})
