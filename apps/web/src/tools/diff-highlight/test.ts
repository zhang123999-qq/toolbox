// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { highlightHtml, plainDiff } from './utils'
import { sanitizeHtml } from '../../shared/sanitizeHtml'

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

describe('diff-highlight / sanitizeHtml XSS 载荷（WP1 要求至少 3 个）', () => {
  it('事件属性被清除（onmouseover）', () => {
    const html = sanitizeHtml('<span onmouseover="alert(1)">x</span>')
    expect(html).not.toContain('onmouseover')
    expect(html).toContain('<span>x</span>')
  })
  it('javascript: 链接被清除（img src）', () => {
    const html = sanitizeHtml('<img src="javascript:alert(1)">')
    expect(html).not.toContain('javascript:')
    // sanitizeHtml 保留 <img> 标签但删除不安全 src，结果为 <img>
    expect(html).toContain('<img>')
  })
  it('标签注入被清除（iframe + script）', () => {
    const html = sanitizeHtml('<iframe src="x"></iframe><script>alert(1)</script><p>a</p>')
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('<script>')
    expect(html).toContain('<p>a</p>')
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
