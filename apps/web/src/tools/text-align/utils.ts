import { displayWidth } from '../../lib/text'
import type { TextAlignInput, TextAlignOptions } from './schema'

/** 按显示列宽算出需要的填充串；已超宽时返回空串（调用方再把原文本拼回来） */
export function pad(text: string, total: number, filler: string): string {
  const lack = total - displayWidth(text)
  if (lack <= 0) return ''
  const unit = filler === '' ? ' ' : filler
  let out = ''
  while (displayWidth(out) < lack) out += unit
  return out
}

/** 左对齐：右侧补填充 */
export function alignLeft(line: string, width: number, filler: string): string {
  return line + pad(line, width, filler)
}

/** 右对齐：左侧补填充 */
export function alignRight(line: string, width: number, filler: string): string {
  return pad(line, width, filler) + line
}

/** 居中：两侧均分，多出来的一个放在右侧 */
export function alignCenter(line: string, width: number, filler: string): string {
  const lack = width - displayWidth(line)
  if (lack <= 0) return line
  const left = Math.floor(lack / 2)
  return pad('', left, filler) + line + pad('', lack - left, filler)
}

/**
 * 两端对齐：把填充塞进词间空隙。
 * 只有一个词、或没有空隙时退化为左对齐，否则会把行撑坏。
 */
export function alignFill(line: string, width: number, filler: string): string {
  const lack = width - displayWidth(line)
  if (lack <= 0) return line
  const parts = line.split(' ')
  if (parts.length < 2) return alignLeft(line, width, filler)
  const gaps = parts.length - 1
  const out: string[] = [parts[0]]
  for (let i = 1; i < parts.length; i += 1) {
    // 余数摊到前面的空隙里，避免右侧出现半格偏差
    const share = Math.floor((lack * i) / gaps) - Math.floor((lack * (i - 1)) / gaps)
    out.push(pad('', displayWidth('') + share, filler) + parts[i])
  }
  return out.join(' ')
}

/** 对齐：逐行处理，超过目标宽度的行原样保留 */
export function transform(input: TextAlignInput, options: TextAlignOptions): string {
  if (input.text === '') return ''
  const width = Math.max(1, Number(options.width) || 40)
  const filler = options.filler === '' ? ' ' : options.filler
  const align = {
    left: alignLeft,
    right: alignRight,
    center: alignCenter,
    fill: alignFill,
  }[options.mode]
  return input.text
    .split(/\r?\n/)
    .map((line) => align(line, width, filler))
    .join('\n')
}
