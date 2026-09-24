import MarkdownIt from 'markdown-it'
import type { MarkdownPreviewInput, MarkdownPreviewOptions } from './schema'

/**
 * 渲染为 HTML 字符串（由 Tool.tsx 放进容器展示）。
 * 关闭 html 选项：输入里的原始 HTML 不被执行，避免把预览区变成注入面。
 */
export function renderHtml(input: MarkdownPreviewInput, options: MarkdownPreviewOptions): string {
  if (input.text.trim() === '') return ''
  const md = new MarkdownIt({ html: false, linkify: true, breaks: options.breaks })
  return md.render(input.text)
}
