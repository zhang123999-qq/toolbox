import { describe, expect, it } from 'vitest'
import { searchTools } from '@toolbox/search'

describe('全局搜索 / 结果可达性', () => {
  it('常见子串 "json" 必须包含排在 catalog 后部的 big-json（不被结果上限截断）', () => {
    const slugs = searchTools('json').map((d) => d.slug)
    expect(slugs).toContain('big-json')
  })

  it('同分时结果按 slug 升序，顺序确定可复现', () => {
    const a = searchTools('json').map((d) => d.slug)
    const b = searchTools('json').map((d) => d.slug)
    expect(a).toEqual(b)
  })

  it('空查询返回空数组', () => {
    expect(searchTools('')).toEqual([])
    expect(searchTools('   ')).toEqual([])
  })

  it('标题精确匹配排在最前', () => {
    const slugs = searchTools('json-formatter').map((d) => d.slug)
    expect(slugs[0]).toBe('json-formatter')
  })

  it('大小写与首尾空格不影响命中', () => {
    expect(searchTools('  JSON ').map((d) => d.slug)).toContain('big-json')
  })
})
