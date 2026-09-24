import { splitWords } from '../../lib/text'
import type { TextTruncateInput, TextTruncateOptions } from './schema'

/** 按字符数截断（用码点切，避免把代理对切成两半） */
export function byChars(text: string, limit: number, ellipsis: string): string {
  const chars = [...text]
  return chars.length <= limit ? text : chars.slice(0, limit).join('') + ellipsis
}

/** 按词数截断：拉丁按词，中文按连续汉字块 */
export function byWords(text: string, limit: number, ellipsis: string): string {
  const words = splitWords(text)
  if (words.length <= limit) return text
  return words.slice(0, limit).join('') + ellipsis
}

/** 按行数截断 */
export function byLines(text: string, limit: number, ellipsis: string): string {
  const lines = text.split(/\r?\n/)
  return lines.length <= limit ? text : lines.slice(0, limit).join('\n') + '\n' + ellipsis
}

/** 截断：未超限时原样返回（不加省略号） */
export function transform(input: TextTruncateInput, options: TextTruncateOptions): string {
  if (input.text === '') return ''
  const limit = Math.max(1, Number(options.limit) || 50)
  const ellipsis = options.ellipsis
  if (options.mode === 'words') return byWords(input.text, limit, ellipsis)
  if (options.mode === 'lines') return byLines(input.text, limit, ellipsis)
  return byChars(input.text, limit, ellipsis)
}
