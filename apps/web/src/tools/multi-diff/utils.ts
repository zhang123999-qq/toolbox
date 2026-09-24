import { signedDiff } from '../../lib/diff'
import type { MultiDiffInput, MultiDiffOptions } from './schema'

/** 一个文件块：名字来自「=== 名字」标记，正文是后续的行 */
export interface FileBlock {
  readonly name: string
  readonly lines: readonly string[]
}

/** 按「=== 文件名」切分；标记之前的正文也算一个块（名字为「文件 N」） */
export function parseBlocks(text: string): FileBlock[] {
  const blocks: Array<{ name: string; lines: string[] }> = []
  let current: { name: string; lines: string[] } | null = null
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('=== ')) {
      current = { name: line.slice(4).trim() || '未命名', lines: [] }
      blocks.push(current)
      continue
    }
    if (!current) {
      current = { name: '文件 ' + (blocks.length + 1), lines: [] }
      blocks.push(current)
    }
    current.lines.push(line)
  }
  return blocks
}

/** 以第一个块为基准，逐个输出它与其余块的差异 */
export function transform(input: MultiDiffInput, options: MultiDiffOptions): string {
  if (input.text === '') return ''
  const blocks = parseBlocks(input.text)
  if (blocks.length === 0) return ''
  if (blocks.length === 1) {
    return (
      '只有一个文件块（' + blocks[0].name + '），无法对比：请用「=== 文件名」标记至少两个文件块。'
    )
  }
  const base = blocks[0]
  const out: string[] = ['基准：' + base.name + '（' + base.lines.length + ' 行）']
  for (const block of blocks.slice(1)) {
    out.push('')
    out.push('--- 与 ' + block.name + ' 的差异')
    out.push(signedDiff(base.lines.join('\n'), block.lines.join('\n'), options.mode))
  }
  return out.join('\n')
}
