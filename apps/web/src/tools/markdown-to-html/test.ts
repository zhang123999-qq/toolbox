import { describe, expect, it } from 'vitest'
import { pickTitle, transform } from './utils'
import type { MarkdownToHtmlOptions } from './schema'

const doc: MarkdownToHtmlOptions = { mode: 'document' }
const frag: MarkdownToHtmlOptions = { mode: 'fragment' }

describe('markdown-to-html / pickTitle', () => {
  it('取第一个标题', () => {
    expect(pickTitle('# 标题\n正文')).toBe('标题')
  })

  it('没标题时退回「文档」', () => {
    expect(pickTitle('正文')).toBe('文档')
  })
})

describe('markdown-to-html / transform', () => {
  it('完整文档模式带 DOCTYPE 与 title', () => {
    const html = transform({ text: '# 工具库\n正文' }, doc)
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<title>工具库</title>')
    expect(html).toContain('<h1>工具库</h1>')
  })

  it('片段模式只输出正文', () => {
    expect(transform({ text: '# 标题' }, frag)).toBe('<h1>标题</h1>\n')
  })

  it('标题里的特殊字符被转义', () => {
    expect(transform({ text: '# a<b' }, doc)).toContain('<title>a&lt;b</title>')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: ' ' }, doc)).toBe('')
  })
})
