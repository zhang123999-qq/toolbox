import { describe, expect, it } from 'vitest'
import type { TzOptions } from './schema'
import { formatInTz, transform, wallToInstant } from './utils'

const base: TzOptions = { fromTz: 'Asia/Shanghai', toTz: 'America/New_York' }

describe('timezone-convert-dev / wallToInstant', () => {
  it('北京时间 14:00 = UTC 06:00（UTC+8）', () => {
    const ms = wallToInstant(2026, 9, 26, 14, 0, 0, 'Asia/Shanghai')
    expect(new Date(ms).toISOString()).toBe('2026-09-26T06:00:00.000Z')
  })

  it('东京 15:00 = UTC 06:00（UTC+9）', () => {
    const ms = wallToInstant(2026, 9, 26, 15, 0, 0, 'Asia/Tokyo')
    expect(new Date(ms).toISOString()).toBe('2026-09-26T06:00:00.000Z')
  })
})

describe('timezone-convert-dev / transform', () => {
  it('北京 → 纽约（9 月 EDT，UTC-4）', () => {
    const out = transform({ text: '2026-09-26 14:00:00' }, base)
    expect(out).toContain('Asia/Shanghai：2026-09-26 14:00:00')
    expect(out).toContain('America/New_York：2026-09-26 02:00:00')
    expect(out).toContain('UTC：2026-09-26 06:00:00')
  })

  it('伦敦夏令时（BST，UTC+1）', () => {
    const out = transform({ text: '2026-09-26 06:00:00' }, { fromTz: 'UTC', toTz: 'Europe/London' })
    expect(out).toContain('Europe/London：2026-09-26 07:00:00')
  })

  it('formatInTz 输出补零格式', () => {
    expect(formatInTz(Date.UTC(2026, 0, 5, 9, 5, 3), 'UTC')).toBe('2026-01-05 09:05:03')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('非法日期格式抛错', () => {
    expect(() => transform({ text: 'garbage' }, base)).toThrow(/日期格式/)
  })

  it('未知时区抛错', () => {
    expect(() =>
      transform({ text: '2026-09-26 14:00:00' }, { fromTz: 'Mars/Olympus', toTz: 'UTC' }),
    ).toThrow(/源时区/)
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
