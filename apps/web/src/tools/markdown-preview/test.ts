import { describe, expect, it } from 'vitest'
import { renderHtml } from './utils'
import type { MarkdownPreviewOptions } from './schema'

const base: MarkdownPreviewOptions = { breaks: false }
const breaks: MarkdownPreviewOptions = { breaks: true }

describe('markdown-preview / renderHtml', () => {
  it('渲染标题', () => {
    expect(renderHtml({ text: '# 标题' }, base)).toContain('<h1>标题</h1>')
  })

  it('渲染强调与列表（GFM）', () => {
    const html = renderHtml({ text: '- **粗体**' }, base)
    expect(html).toContain('<strong>粗体</strong>')
    expect(html).toContain('<li>')
  })

  it('渲染表格（GFM 扩展）', () => {
    const html = renderHtml({ text: '| a | b |\n| - | - |\n| 1 | 2 |' }, base)
    expect(html).toContain('<table>')
  })

  it('默认关闭原始 HTML，输入中的标签被转义而不是执行', () => {
    expect(renderHtml({ text: '<script>x</script>' }, base)).not.toContain('<script>')
  })

  it('开启 breaks 后单换行变成 <br>', () => {
    expect(renderHtml({ text: 'a\nb' }, breaks)).toContain('<br>')
    expect(renderHtml({ text: 'a\nb' }, base)).not.toContain('<br>')
  })

  it('空输入返回空串（边界）', () => {
    expect(renderHtml({ text: '  ' }, base)).toBe('')
  })
})
