import type { LineEndingInput, LineEndingOptions } from './schema'

/** 三种换行符各自的数量，用于判断文本现状 */
export interface EndingCounts {
  readonly lf: number
  readonly crlf: number
  readonly cr: number
}

/** 统计 CRLF / 裸 LF / 裸 CR 各出现多少次（CRLF 不重复计入 LF 与 CR） */
export function detectEndings(text: string): EndingCounts {
  const crlf = (text.match(/\r\n/g) ?? []).length
  const withoutCrlf = text.replace(/\r\n/g, '')
  return {
    crlf,
    lf: (withoutCrlf.match(/\n/g) ?? []).length,
    cr: (withoutCrlf.match(/\r/g) ?? []).length,
  }
}

/** 统一换行符：先把 CRLF / CR 归一成 LF，再换成目标 */
export function toEnding(text: string, target: LineEndingOptions['target']): string {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (target === 'crlf') return normalized.replace(/\n/g, '\r\n')
  if (target === 'cr') return normalized.replace(/\n/g, '\r')
  return normalized
}

export function transform(input: LineEndingInput, options: LineEndingOptions): string {
  return toEnding(input.text, options.target)
}
