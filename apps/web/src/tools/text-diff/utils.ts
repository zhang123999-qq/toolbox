import { diffChars, diffLines } from 'diff'
import type { TextDiffInput, TextDiffOptions } from './schema'

/**
 * 两段文本差异对比：行级用 diffLines，字符级用 diffChars。
 * 输出沿用 diff 的通用约定：+ 新增、- 删除、空格未变。
 */
export function transform(input: TextDiffInput, options: TextDiffOptions): string {
  const changes =
    options.mode === 'char'
      ? diffChars(input.text, input.textB)
      : diffLines(input.text, input.textB)

  const lines: string[] = []
  for (const change of changes) {
    if (!change.value) continue
    const sign = change.added ? '+' : change.removed ? '-' : ' '
    // diffLines 的每个片段都以换行结尾，去掉末尾那个再按行拆，避免多出空行
    const value = change.value.endsWith('\n') ? change.value.slice(0, -1) : change.value
    for (const line of value.split('\n')) lines.push(sign + ' ' + line)
  }
  return lines.join('\n')
}
