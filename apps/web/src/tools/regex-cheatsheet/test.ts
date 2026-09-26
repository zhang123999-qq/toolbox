import { describe, expect, it } from 'vitest'
import type { RegexCheatsheetOptions } from './schema'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  ENTRIES,
  assertCategory,
  filterEntries,
  transform,
} from './utils'

describe('regex-cheatsheet / data', () => {
  it('内置至少 15 条常用正则', () => {
    expect(ENTRIES.length).toBeGreaterThanOrEqual(15)
  })

  it('每条都有名称/正则/说明', () => {
    for (const e of ENTRIES) {
      expect(e.name.length).toBeGreaterThan(0)
      expect(e.pattern.length).toBeGreaterThan(0)
      expect(e.note.length).toBeGreaterThan(0)
    }
  })

  it('覆盖 5 个分类', () => {
    const cats = new Set(ENTRIES.map((e) => e.category))
    expect([...cats].sort()).toEqual(['date', 'identity', 'number', 'text', 'web'])
  })

  it('分类常量表完整', () => {
    expect([...CATEGORIES]).toEqual(['all', 'web', 'identity', 'number', 'date', 'text'])
    expect(Object.keys(CATEGORY_LABEL)).toHaveLength(5)
  })
})

describe('regex-cheatsheet / filterEntries', () => {
  it('all 返回全部', () => {
    expect(filterEntries('all')).toHaveLength(ENTRIES.length)
  })

  it('按分类过滤', () => {
    expect(filterEntries('web').every((e) => e.category === 'web')).toBe(true)
    expect(filterEntries('date').length).toBeGreaterThan(0)
  })

  it('非法分类报错', () => {
    expect(() => assertCategory('bogus')).toThrow(/不支持的分类/)
  })
})

describe('regex-cheatsheet / transform', () => {
  const base: RegexCheatsheetOptions = { category: 'all' }

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('输出含分类标题与邮箱条目', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('分类：全部常用正则')
    expect(out).toContain('【电子邮箱】')
    expect(out).toContain('/^[\\w.+-]+@[\\w-]')
  })

  it('过滤到 number 分类时只出现数值条目', () => {
    const out = transform({ text: 'x' }, { category: 'number' })
    expect(out).toContain('分类：数值')
    expect(out).toContain('【整数】')
    expect(out).not.toContain('【电子邮箱】')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('非法分类选项被抛错', () => {
    const bad = { category: 'bogus' } as unknown as RegexCheatsheetOptions
    expect(() => transform({ text: 'x' }, bad)).toThrow(/不支持的分类/)
  })
})
