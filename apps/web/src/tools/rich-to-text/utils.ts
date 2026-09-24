import type { RichToTextInput, RichToTextOptions } from './schema'

/** 需要解码的常见实体 */
const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/** 产生换行的标签 */
const BLOCK_TAGS = /<\s*\/?\s*(p|div|br|li|tr|h[1-6]|blockquote|section|article)\b[^>]*>/gi

export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_all, hex) => safeFromCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_all, dec) => safeFromCode(Number(dec)))
    .replace(/&([a-z]+);/gi, (all, name) => ENTITIES[String(name).toLowerCase()] ?? all)
}

function safeFromCode(code: number): string {
  return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : ''
}

/** 去掉 script / style 及其内容，避免把样式代码当正文 */
export function stripInvisible(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
}

export function stripTags(html: string, keepLineBreaks: boolean): string {
  const cleaned = stripInvisible(html)
  // 块级标签先换成换行，其余标签直接删除
  const withBreaks = keepLineBreaks
    ? cleaned.replace(BLOCK_TAGS, '\n')
    : cleaned.replace(BLOCK_TAGS, ' ')
  const noTags = withBreaks.replace(/<[^>]*>/g, '')
  const text = decodeEntities(noTags)
  const lines = text.split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim())
  const kept = lines.filter((line) => line !== '')
  // 保留换行：相邻块级标签会产生连续空行，压缩为一个换行；关闭时压成一行
  return keepLineBreaks ? kept.join('\n') : kept.join(' ')
}

export function transform(input: RichToTextInput, options: RichToTextOptions): string {
  if (input.text.trim() === '') return ''
  return stripTags(input.text, options.keepLineBreaks)
}
