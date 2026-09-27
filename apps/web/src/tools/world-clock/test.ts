import { describe, expect, it } from 'vitest'
import type { WorldClockOptions } from './schema'
import {
  buildRows,
  isValidTimeZone,
  offsetLabel,
  parseZoneList,
  transform,
  wallParts,
  zoneOffsetMinutes,
} from './utils'

const opts: WorldClockOptions = { hour12: false }

describe('world-clock / 时区校验', () => {
  it('合法 IANA 时区通过，非法名被拒', () => {
    expect(isValidTimeZone('Asia/Shanghai')).toBe(true)
    expect(isValidTimeZone('America/New_York')).toBe(true)
    expect(isValidTimeZone('Foo/Bar')).toBe(false)
    expect(isValidTimeZone('Asia/Shanghai ')).toBe(false)
  })
})

describe('world-clock / 偏移计算', () => {
  it('Asia/Shanghai 恒为东八区 +08:00（无 DST）', () => {
    // 2026-01-01 UTC
    const d = new Date(Date.UTC(2026, 0, 1, 12, 0, 0))
    expect(zoneOffsetMinutes('Asia/Shanghai', d)).toBe(480)
    expect(offsetLabel(480)).toBe('+08:00')
  })

  it('America/New_York 在一月为 EST -05:00，七月为 EDT -04:00（DST）', () => {
    const jan = new Date(Date.UTC(2026, 0, 15, 12, 0, 0))
    const jul = new Date(Date.UTC(2026, 6, 15, 12, 0, 0))
    expect(offsetLabel(zoneOffsetMinutes('America/New_York', jan))).toBe('-05:00')
    expect(offsetLabel(zoneOffsetMinutes('America/New_York', jul))).toBe('-04:00')
  })

  it('offsetLabel 处理负偏移与零', () => {
    expect(offsetLabel(-240)).toBe('-04:00')
    expect(offsetLabel(0)).toBe('+00:00')
    expect(offsetLabel(-725)).toBe('-12:05')
  })
})

describe('world-clock / 墙上时间分量', () => {
  it('把 UTC 时刻换算成目标时区墙上时间', () => {
    // 2026-09-27 02:00 UTC → Asia/Shanghai 为 10:00
    const d = new Date(Date.UTC(2026, 8, 27, 2, 0, 0))
    const w = wallParts(d, 'Asia/Shanghai')
    expect(w).toMatchObject({ y: 2026, mo: 9, d: 27, h: 10, mi: 0, s: 0 })
  })
})

describe('world-clock / 行构造', () => {
  it('buildRows 对齐列并带 UTC 偏移', () => {
    const now = new Date(Date.UTC(2026, 8, 27, 2, 0, 0))
    const rows = buildRows(['Asia/Shanghai', 'UTC'], false, now)
    expect(rows[0].line).toContain('2026-09-27 10:00:00')
    expect(rows[0].line).toContain('(UTC+08:00)')
    expect(rows[1].line).toContain('2026-09-27 02:00:00')
  })

  it('12 小时制带上午/下午', () => {
    const now = new Date(Date.UTC(2026, 8, 27, 2, 0, 0))
    const rows = buildRows(['Asia/Shanghai'], true, now)
    expect(rows[0].line).toContain('10:00:00 上午')
  })
})

describe('world-clock / transform', () => {
  it('解析时区列表：去空白、去空行', () => {
    expect(parseZoneList('Asia/Shanghai\n\n  UTC \n')).toEqual(['Asia/Shanghai', 'UTC'])
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts)).toBe('')
    expect(transform({ text: '   \n  ' }, opts)).toBe('')
  })

  it('非法时区名抛中文错误', () => {
    expect(() => transform({ text: 'Foo/Bar' }, opts)).toThrow(/非法时区名/)
  })

  it('输入超过上限抛错', () => {
    expect(() => transform({ text: 'Asia/Shanghai\n' + 'x'.repeat(200000) }, opts)).toThrow(/上限/)
  })

  it('合法输入产出多行结果', () => {
    const out = transform({ text: 'Asia/Shanghai\nUTC' }, opts)
    expect(out.split('\n').length).toBe(2)
    expect(out).toContain('Asia/Shanghai')
  })
})
