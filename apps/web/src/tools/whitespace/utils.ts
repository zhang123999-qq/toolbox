import type { WhitespaceInput, WhitespaceOptions } from './schema'

/** 行内连续空白：空格、制表符、不换行空格都算 */
const RUNS = /[ \t\u00a0]+/g

/** 清理空白：先去行首尾，再合并行内连续空白，最后删空行 */
export function transform(input: WhitespaceInput, options: WhitespaceOptions): string {
  let lines = input.text.split(/\r?\n/)
  if (options.trimLines) lines = lines.map((line) => line.trim())
  if (options.collapse) lines = lines.map((line) => line.replace(RUNS, ' '))
  if (options.removeEmpty) lines = lines.filter((line) => line !== '')
  return lines.join('\n')
}
