import type { CaseConvertInput, CaseConvertOptions } from './schema'

/** 按模式转换大小写；中文字符不受影响，逐字符处理保证不丢内容 */
export function convert(text: string, mode: string): string {
  switch (mode) {
    case 'lower':
      return text.toLowerCase()
    case 'capitalize':
      return capitalize(text)
    case 'title':
      return titleCase(text)
    case 'upper':
    default:
      return text.toUpperCase()
  }
}

/** 首字母大写，其余字符保持原样 */
export function capitalize(text: string): string {
  if (text === '') return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** 标题化：每个词首字母大写、其余小写（先整体小写，避免 ABc 残留） */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^|[\s\-_([{])(\p{Ll})/gu, (_all, sep, letter) => sep + String(letter).toUpperCase())
}

export function transform(input: CaseConvertInput, options: CaseConvertOptions): string {
  if (input.text === '') return ''
  return convert(input.text, options.mode)
}
