import { describe, expect, it } from 'vitest'
import { highlightHtml, plainDiff } from './utils'

describe('diff-highlight / highlightHtml', () => {
  const base = { mode: 'line' } as const

  it('新增与删除分别用 ins / del 标记', () => {
    const html = highlightHtml({ text: 'a\nb', textB: 'a\nc' }, base)
    expect(html).toContain('<ins')
    expect(html).toContain('<del')
  })

  it('未变部分原样输出', () => {
    expect(highlightHtml({ text: 'a\nb', textB: 'a\nc' }, base)).toContain('>a')
  })

  it('HTML 特殊字符被转义', () => {
    const html = highlightHtml({ text: '<script>', textB: '<div>' }, base)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('字符级模式把空格显示成可见符号', () => {
    const html = highlightHtml({ text: 'a b', textB: 'a  b' }, { mode: 'char' })
    expect(html).toContain('⋅')
  })

  it('两边都为空时返回空串', () => {
    expect(highlightHtml({ text: '', textB: '' }, base)).toBe('')
  })
})

describe('diff-highlight / plainDiff', () => {
  const base = { mode: 'line' } as const

  it('沿用 +/- 约定', () => {
    expect(plainDiff({ text: 'a\nb', textB: 'a\nc' }, base)).toContain('- b')
    expect(plainDiff({ text: 'a\nb', textB: 'a\nc' }, base)).toContain('+ c')
  })

  it('完全相同只留下未变行', () => {
    expect(plainDiff({ text: 'a', textB: 'a' }, base)).toBe('  a')
  })
})
