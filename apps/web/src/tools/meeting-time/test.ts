import { describe, expect, it } from 'vitest'
import { assertTimezone, daypartOf, parseZoneList, transform, wallToInstant } from './utils'

describe('meeting-time / daypartOf', () => {
  it('9-17 点是工作时间', () => {
    expect(daypartOf(9)).toBe('work')
    expect(daypartOf(12)).toBe('work')
    expect(daypartOf(16)).toBe('work')
  })

  it('22 点后到 6 点前是深夜', () => {
    expect(daypartOf(23)).toBe('late')
    expect(daypartOf(2)).toBe('late')
    expect(daypartOf(5)).toBe('late')
  })

  it('其余是其他时段', () => {
    expect(daypartOf(7)).toBe('other')
    expect(daypartOf(18)).toBe('other')
  })
})

describe('meeting-time / parseZoneList', () => {
  it('按行解析，去空行去重保序', () => {
    expect(parseZoneList('Asia/Shanghai\n\nUTC\nUTC\nEurope/London')).toEqual([
      'Asia/Shanghai',
      'UTC',
      'Europe/London',
    ])
  })

  it('空串返回空数组', () => {
    expect(parseZoneList('')).toEqual([])
  })
})

describe('meeting-time / wallToInstant & assertTimezone', () => {
  it('UTC 源时区：墙钟 14:00 = UTC 14:00', () => {
    const inst = wallToInstant('2026-09-28 14:00', 'UTC')
    expect(new Date(inst).getUTCHours()).toBe(14)
    expect(new Date(inst).getUTCDate()).toBe(28)
  })

  it('上海(UTC+8) 14:00 = UTC 06:00', () => {
    const inst = wallToInstant('2026-09-28 14:00', 'Asia/Shanghai')
    expect(new Date(inst).getUTCHours()).toBe(6)
  })

  it('格式错误抛中文错', () => {
    expect(() => wallToInstant('9月28号', 'UTC')).toThrow(/格式/)
  })

  it('2 月 30 日 / 25:99 必须抛错，不得静默进位', () => {
    expect(() => wallToInstant('2026-02-30 14:00', 'UTC')).toThrow(/日期越界/)
    expect(() => wallToInstant('2026-02-30 25:99', 'UTC')).toThrow(/日期越界|时间越界/)
  })

  it('非法时区抛中文错', () => {
    expect(() => assertTimezone('Mars/Olympus')).toThrow(/无法识别/)
  })
})

describe('meeting-time / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', sourceZone: 'UTC', zones: '' })).toBe('')
  })

  it('上海 14:00 换算到 UTC 显示 06:00', () => {
    const out = transform({
      text: '2026-09-28 14:00',
      sourceZone: 'Asia/Shanghai',
      zones: 'UTC',
    })
    expect(out).toContain('源时区 Asia/Shanghai')
    expect(out).toContain('UTC：')
    expect(out).toContain('06:00')
  })

  it('标注工作时间 / 深夜', () => {
    // UTC 14:00 → 当地 14:00 工作时间；UTC 23:00 → 深夜
    const dayWork = transform({ text: '2026-09-28 14:00', sourceZone: 'UTC', zones: 'UTC' })
    expect(dayWork).toContain('工作时间')
    const night = transform({ text: '2026-09-28 23:00', sourceZone: 'UTC', zones: 'UTC' })
    expect(night).toContain('深夜')
  })

  it('非法时区进入错误态', () => {
    expect(() =>
      transform({ text: '2026-09-28 14:00', sourceZone: 'UTC', zones: 'Not/AZone' }),
    ).toThrow(/无法识别/)
  })
})
