import { describe, expect, it } from 'vitest'
import { allTimeZones, filterZones, formatZoneLine, transform } from './utils'

describe('timezone-list / 枚举与过滤', () => {
  it('能枚举到 Asia/Shanghai 等已知时区', () => {
    const all = allTimeZones()
    expect(all.length).toBeGreaterThan(300)
    expect(all).toContain('Asia/Shanghai')
    expect(all).toContain('Europe/London')
  })

  it('按关键词大小写不敏感过滤', () => {
    const asia = filterZones('Asia')
    expect(asia.length).toBeGreaterThan(5)
    for (const tz of asia) expect(tz).toContain('Asia')
    expect(filterZones('shanghai')).toEqual(['Asia/Shanghai'])
  })

  it('无匹配返回空数组', () => {
    expect(filterZones('NoSuchPlaceXYZ')).toEqual([])
  })
})

describe('timezone-list / 行格式', () => {
  it('formatZoneLine 含时区、时间与偏移', () => {
    const line = formatZoneLine('Asia/Shanghai', new Date())
    expect(line).toContain('Asia/Shanghai')
    expect(line).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)
    expect(line).toMatch(/\(UTC[+-]\d{2}:\d{2}\)/)
  })
})

describe('timezone-list / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('无关键词匹配时给出提示（非错误态）', () => {
    const out = transform({ text: 'NoSuchPlaceXYZ' }, {})
    expect(out).toContain('无匹配的时区')
  })

  it('过滤 Asia 产出多行', () => {
    const out = transform({ text: 'Asia' }, {})
    expect(out.split('\n').length).toBeGreaterThan(5)
    expect(out).toContain('Asia/Shanghai')
  })

  it('输入超过上限抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
