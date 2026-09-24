import MarkdownIt from 'markdown-it'
import type { MarkdownToHtmlInput, MarkdownToHtmlOptions } from './schema'

/** 取第一个标题当文档标题，取不到就退回固定文案 */
export function pickTitle(markdown: string): string {
  const match = markdown.match(/^#{1,6}\s+(.+)$/m)
  return match ? match[1].trim() : '文档'
}

/** 渲染正文片段 */
export function renderBody(markdown: string): string {
  const md = new MarkdownIt({ html: false, linkify: true })
  return md.render(markdown)
}

/** 包成带 charset 与 title 的完整文档 */
export function toDocument(markdown: string): string {
  const title = pickTitle(markdown)
  const body = renderBody(markdown)
  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + escapeHtml(title) + '</title>',
    '</head>',
    '<body>',
    body,
    '</body>',
    '</html>',
  ].join('\n')
}

function escapeHtml(text: string): string {
  return text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;')
}

export function transform(input: MarkdownToHtmlInput, options: MarkdownToHtmlOptions): string {
  if (input.text.trim() === '') return ''
  return options.mode === 'fragment' ? renderBody(input.text) : toDocument(input.text)
}
