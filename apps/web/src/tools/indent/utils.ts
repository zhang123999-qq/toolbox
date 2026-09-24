import type { IndentInput, IndentOptions } from './schema'

/** 把行拆成「行首缩进」与「其余内容」——只动行首，行中间的空白不动 */
export function splitIndent(line: string): [string, string] {
  const matched = /^[ \t]*/.exec(line)
  const indent = matched ? matched[0] : ''
  return [indent, line.slice(indent.length)]
}

/** Tab → 空格：一个 Tab 换成 width 个空格 */
export function toSpaces(line: string, width: number): string {
  const [indent, rest] = splitIndent(line)
  return indent.replace(/\t/g, ' '.repeat(width)) + rest
}

/** 空格 → Tab：先把 Tab 展开再按 width 归并，不足一组的部分保留空格 */
export function toTabs(line: string, width: number): string {
  const [indent, rest] = splitIndent(line)
  const spaces = indent.replace(/\t/g, ' '.repeat(width)).length
  return '\t'.repeat(Math.floor(spaces / width)) + ' '.repeat(spaces % width) + rest
}

/** 增减一级缩进：增加用空格；减少优先去掉一个 Tab，否则最多去掉 width 个空格 */
export function shift(line: string, width: number, delta: number): string {
  const [indent, rest] = splitIndent(line)
  if (delta > 0) return indent + ' '.repeat(width) + rest
  if (indent.startsWith('\t')) return indent.slice(1) + rest
  const spaces = /^ +/.exec(indent)
  const remove = Math.min(width, spaces ? spaces[0].length : 0)
  return indent.slice(remove) + rest
}

/** 逐行处理：空行没有缩进，四种模式下都原样返回 */
export function transform(input: IndentInput, options: IndentOptions): string {
  const width = Number(options.width)
  return input.text
    .split(/\r?\n/)
    .map((line) => {
      // 空行不参与增减，避免留下只有空白的行
      if ((options.mode === 'increase' || options.mode === 'decrease') && line.trim() === '') {
        return line
      }
      if (options.mode === 'to-tabs') return toTabs(line, width)
      if (options.mode === 'increase') return shift(line, width, 1)
      if (options.mode === 'decrease') return shift(line, width, -1)
      return toSpaces(line, width)
    })
    .join('\n')
}
