import type { BlankLinesInput, BlankLinesOptions } from './schema'
// 空行的判定与两种处理方式已在 lib/pipeline.ts 定义，#70 文本工作台复用同一份
import { dropEmpty, isBlank, squeezeEmpty } from '../../lib/pipeline'

/** 空行定义对外保留：去掉 \r 后只剩空白（空格、制表符）的行也算空行 */
export { isBlank } from '../../lib/pipeline'

/** 删掉所有空行 */
export function removeBlank(lines: readonly string[]): string[] {
  return dropEmpty(lines)
}

/** 连续空行压缩成一个 */
export function collapseBlank(lines: readonly string[]): string[] {
  return squeezeEmpty(lines)
}

/** 只去掉开头与结尾的空行 */
export function trimBlank(lines: readonly string[]): string[] {
  let start = 0
  let end = lines.length
  while (start < end && isBlank(lines[start])) start += 1
  while (end > start && isBlank(lines[end - 1])) end -= 1
  return lines.slice(start, end)
}

/** 空行处理 */
export function transform(input: BlankLinesInput, options: BlankLinesOptions): string {
  if (input.text === '') return ''
  const lines = input.text.split(/\r?\n/)
  if (options.mode === 'collapse') return collapseBlank(lines).join('\n')
  if (options.mode === 'trim') return trimBlank(lines).join('\n')
  return removeBlank(lines).join('\n')
}
