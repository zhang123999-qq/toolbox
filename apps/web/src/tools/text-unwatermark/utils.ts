import { countZeroWidth, markZeroWidth, stripZeroWidth } from '../../lib/zerowidth'
import type { TextUnwatermarkInput, TextUnwatermarkOptions } from './schema'

/** 替换零宽字符时用的可见标记 */
export const MARKER = '␣'

/** 直接移除：零宽与方向控制字符全部去掉 */
export function strip(text: string): string {
  return stripZeroWidth(text)
}

/** 换成可见标记：先看清它们原本在哪，再决定要不要删 */
export function mark(text: string): string {
  return markZeroWidth(text, MARKER)
}

/** 统计零宽字符个数 */
export function count(text: string): number {
  return countZeroWidth(text)
}

/** 移除 / 标记零宽水印 */
export function transform(input: TextUnwatermarkInput, options: TextUnwatermarkOptions): string {
  if (input.text === '') return ''
  return options.mode === 'mark' ? mark(input.text) : strip(input.text)
}
