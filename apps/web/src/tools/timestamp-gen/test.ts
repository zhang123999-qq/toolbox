import { describe, expect, it } from 'vitest'
import type { TsGenOptions } from './schema'
import { isValidTimeZone, parseWall, transform, wallToInstant, wallParts } from './utils'

const shanghai: TsGenOptions = { zone: 'Asia/Shanghai' }

describe('timestamp-gen / 解析', () => {
  it('解析墙上时间分量', () => {
    expect(parseWall('2026-09-27 15:30:00')).toEqual({ y: 2026, mo: 9, d: 27, h: 15, mi: 30, s: 0 })
  })

  it('非法日期（2/29 非闰年）抛错', () => {
    expect(() => parseWall('2026-02-29')).toThrow(/非法日期/)
  })

  it('时间越界（25:99:99）必须抛错，不得静默进位', () => {
    expect(() => parseWall('2026-09-27 25:99:99')).toThrow(/时间越界/)
    expect(() => parseWall('2026-09-27 12:99:00')).toThrow(/时间越界/)
  })

  it('解析不了抛中文错误', () => {
    expect(() => parseWall('下个月一号')).toThrow(/无法解析的日期时间/)
  })
})

describe('timestamp-gen / 生成时间戳', () => {
  it('上海 2026-09-27 15:30 → UTC 07:30，秒为 1790494200', () => {
    const out = transform({ text: '2026-09-27 15:30:00' }, shanghai)
    expect(out).toContain('Unix 秒：1790494200')
    expect(out).toContain('Unix 毫秒：1790494200000')
    expect(out).toContain('UTC：2026-09-27 07:30:00')
  })

  it('wallToInstant 往返一致', () => {
    const wall = { y: 2026, mo: 9, d: 27, h: 15, mi: 30, s: 0 }
    const inst = wallToInstant('Asia/Shanghai', wall)
    expect(wallParts(new Date(inst), 'Asia/Shanghai')).toEqual(wall)
  })

  it('DST：纽约 7 月时间按 EDT 反推', () => {
    // 纽约 2026-07-15 12:00（EDT, UTC-4）→ UTC 16:00
    const wall = { y: 2026, mo: 7, d: 15, h: 12, mi: 0, s: 0 }
    const inst = wallToInstant('America/New_York', wall)
    expect(wallParts(new Date(inst), 'UTC')).toMatchObject({ y: 2026, mo: 7, d: 15, h: 16 })
  })

  it('留空时区按本地解释（结果是有限数字）', () => {
    const out = transform({ text: '2026-09-27 15:30:00' }, { zone: '' })
    expect(out).toContain('Unix 秒：')
    expect(out).toMatch(/Unix 毫秒：-?\d+/)
  })
})

describe('timestamp-gen / 错误与边界', () => {
  it('非法时区抛错', () => {
    expect(isValidTimeZone('Moon/Base')).toBe(false)
    expect(() => transform({ text: '2026-09-27 15:30' }, { zone: 'Moon/Base' })).toThrow(/非法时区/)
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, shanghai)).toBe('')
  })

  it('输入超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, shanghai)).toThrow(/上限/)
  })
})
