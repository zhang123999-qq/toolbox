import type { BlankLinesInput, BlankLinesOptions } from './schema'

/**
 * 空行定义：去掉 \r 后只剩空白（空格、制表符）的行也算空行。
 * 只含空格的行在编辑器里看起来是空的，按「是空行」处理才符合直觉。
 */
export function isBlank(line: string): boolean {
  return line.replace(/\r$/, '').trim() === ''
}

/** 删掉所有空行 */
export function removeBlank(lines: readonly string[]): string[] {
  return lines.filter((line) => !isBlank(line))
}

/** 连续空行压缩成一个；压出来的空行统一写成真空行，不留残余空格 */
export function collapseBlank(lines: readonly string[]): string[] {
  const out: string[] = []
  let lastBlank = false
  for (const line of lines) {
    const blank = isBlank(line)
    if (blank && lastBlank) continue
    out.push(blank ? '' : line)
    lastBlank = blank
  }
  return out
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
