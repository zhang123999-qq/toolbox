import { describe, expect, it } from 'vitest'
import type { RegexTesterOptions } from './schema'
import { annotate, buildFlags, collectMatches, compile, renderMatches, transform } from './utils'

const base: RegexTesterOptions = {
  global: true,
  ignoreCase: false,
  multiline: false,
  dotAll: false,
  unicode: false,
}

describe('regex-tester / buildFlags', () => {
  it('按固定顺序拼 flags', () => {
    expect(buildFlags(base)).toBe('g')
    expect(
      buildFlags({ global: true, ignoreCase: true, multiline: true, dotAll: true, unicode: true }),
    ).toBe('gimsu')
  })

  it('全关时为空串', () => {
    expect(buildFlags({ ...base, global: false })).toBe('')
  })
})

describe('regex-tester / collectMatches', () => {
  it('global 下收集全部命中与分组', () => {
    const re = compile('#([A-Z])(\\d+)', base)
    const items = collectMatches(re, '订单 #A1001 与 #B2050')
    expect(items).toHaveLength(2)
    expect(items[0].match).toBe('#A1001')
    expect(items[0].index).toBe(3)
    expect(items[0].groups).toEqual(['A', '1001'])
    expect(items[1].groups).toEqual(['B', '2050'])
  })

  it('非 global 只取第一个命中', () => {
    const re = compile('\\d+', { ...base, global: false })
    expect(collectMatches(re, 'a1 b2 c3')).toHaveLength(1)
  })

  it('无命中返回空数组', () => {
    expect(collectMatches(compile('xyz', base), 'abc')).toEqual([])
  })

  it('空命中不死循环', () => {
    const re = compile('x*', base)
    const items = collectMatches(re, 'ab')
    expect(items.length).toBeGreaterThan(0)
  })
})

describe('regex-tester / annotate', () => {
  it('用 ⟦ ⟧ 包裹命中段', () => {
    const re = compile('\\d+', base)
    const items = collectMatches(re, 'a12b')
    expect(annotate('a12b', items)).toBe('a⟦12⟧b')
  })
})

describe('regex-tester / transform', () => {
  it('输出命中清单与标注视图', () => {
    const out = transform({ text: 'a12b34', pattern: '\\d+' }, base)
    expect(out).toContain('共 2 个匹配')
    expect(out).toContain('#1')
    expect(out).toContain('⟦12⟧')
    expect(out).toContain('⟦34⟧')
  })

  it('空文本或空正则返回空串', () => {
    expect(transform({ text: '', pattern: '\\d+' }, base)).toBe('')
    expect(transform({ text: 'abc', pattern: '' }, base)).toBe('')
  })

  it('非法正则抛中文错误', () => {
    expect(() => transform({ text: 'abc', pattern: '(' }, base)).toThrow(/非法正则/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001), pattern: 'a' }, base)).toThrow(/上限/)
  })

  it('renderMatches 无命中时给出提示', () => {
    expect(renderMatches([])).toBe('（没有匹配）')
  })
})
