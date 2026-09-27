import { describe, expect, it } from 'vitest'
import type { TzConvertOptions } from './schema'
import {
  isValidTimeZone,
  offsetLabel,
  parseWall,
  transform,
  wallToInstant,
  wallParts,
  zoneOffsetMinutes,
} from './utils'

const base: TzConvertOptions = { fromZone: 'Asia/Shanghai', toZone: 'America/New_York' }

describe('timezone-convert / 解析墙上时间', () => {
  it('解析 YYYY-MM-DD HH:mm:ss', () => {
    expect(parseWall('2026-09-27 15:30:00')).toEqual({ y: 2026, mo: 9, d: 27, h: 15, mi: 30, s: 0 })
  })

  it('支持斜杠与缺省时分秒', () => {
    expect(parseWall('2026/9/27')).toEqual({ y: 2026, mo: 9, d: 27, h: 0, mi: 0, s: 0 })
    expect(parseWall('2026-09-27T15:30')).toEqual({ y: 2026, mo: 9, d: 27, h: 15, mi: 30, s: 0 })
  })

  it('解析不了抛中文错误，不静默 Invalid Date', () => {
    expect(() => parseWall('下个礼拜三')).toThrow(/无法解析的时间/)
    expect(() => parseWall('2026-13-40')).toThrow(/无法解析的时间|日期越界/)
  })

  it('时间越界抛错', () => {
    expect(() => parseWall('2026-09-27 25:00')).toThrow(/时间越界/)
  })

  it('日号不存在（2 月 30 日）抛错而非静默进位', () => {
    expect(() => parseWall('2026-02-30')).toThrow(/日期越界/)
    expect(() => parseWall('2026-04-31')).toThrow(/日期越界/)
  })
})

describe('timezone-convert / 偏移与反推', () => {
  it('上海恒为 +08:00', () => {
    expect(offsetLabel(zoneOffsetMinutes('Asia/Shanghai', new Date()))).toBe('+08:00')
  })

  it('wallToInstant 往返一致（上海→UTC→上海）', () => {
    const wall = { y: 2026, mo: 9, d: 27, h: 15, mi: 30, s: 0 }
    const inst = wallToInstant('Asia/Shanghai', wall)
    expect(wallParts(new Date(inst), 'Asia/Shanghai')).toEqual(wall)
  })

  it('DST：纽约 1 月 -05、7 月 -04', () => {
    const jan = new Date(Date.UTC(2026, 0, 15, 12, 0))
    const jul = new Date(Date.UTC(2026, 6, 15, 12, 0))
    expect(offsetLabel(zoneOffsetMinutes('America/New_York', jan))).toBe('-05:00')
    expect(offsetLabel(zoneOffsetMinutes('America/New_York', jul))).toBe('-04:00')
  })
})

describe('timezone-convert / transform', () => {
  it('上海 15:30 → UTC 07:30 → 纽约 03:30（9 月 EDT）', () => {
    const out = transform({ text: '2026-09-27 15:30:00' }, base)
    expect(out).toContain('源时间：2026-09-27 15:30:00（Asia/Shanghai，UTC+08:00）')
    expect(out).toContain('目标时间：2026-09-27 03:30:00（America/New_York，UTC-04:00）')
    expect(out).toContain('UTC 时间：2026-09-27 07:30:00')
  })

  it('冬季换算跨日：上海晚 20:00 → 纽约早 07:00（EST）', () => {
    const out = transform({ text: '2026-01-15 20:00:00' }, base)
    expect(out).toContain('目标时间：2026-01-15 07:00:00（America/New_York，UTC-05:00）')
  })

  it('非法时区名抛错', () => {
    expect(() =>
      transform({ text: '2026-09-27 15:30' }, { fromZone: 'Mars/Olympus', toZone: 'UTC' }),
    ).toThrow(/非法源时区/)
    expect(() => transform({ text: '2026-09-27 15:30' }, { fromZone: 'UTC', toZone: '' })).toThrow(
      /非法目标时区/,
    )
    expect(isValidTimeZone('UTC')).toBe(true)
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('输入超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
