import type { TextPadInput, TextPadOptions } from './schema'

/** 造出指定长度的填充串：filler 多字符时循环取用，最后按需要的长度截断 */
export function filler(length: number, unit: string): string {
  if (length <= 0) return ''
  const ch = unit === '' ? ' ' : unit
  let out = ''
  while (out.length < length) out += ch
  return out.slice(0, length)
}

/** 左填充（右侧对齐）：编号补零的典型用法 */
export function padLeft(text: string, length: number, unit: string): string {
  return text.length >= length ? text : filler(length - text.length, unit) + text
}

/** 右填充（左侧对齐） */
export function padRight(text: string, length: number, unit: string): string {
  return text.length >= length ? text : text + filler(length - text.length, unit)
}

/** 两侧均分，多出来的一个放在右侧 */
export function padCenter(text: string, length: number, unit: string): string {
  if (text.length >= length) return text
  const lack = length - text.length
  const left = Math.floor(lack / 2)
  return filler(left, unit) + text + filler(lack - left, unit)
}

/** 两边同时填，各填到指定长度（总长为 text + 2 × 长度） */
export function padBoth(text: string, length: number, unit: string): string {
  return filler(length, unit) + text + filler(length, unit)
}

/** 填充：逐行独立处理 */
export function transform(input: TextPadInput, options: TextPadOptions): string {
  if (input.text === '') return ''
  const length = Math.max(0, Number(options.length) || 0)
  const unit = options.filler
  const pad = {
    left: padLeft,
    right: padRight,
    both: padBoth,
    center: padCenter,
  }[options.mode]
  return input.text
    .split(/\r?\n/)
    .map((line) => pad(line, length, unit))
    .join('\n')
}
