/**
 * 文本差异的共用渲染。
 *
 * 文本域 #35「文本 Diff」与 #36「多文件 Diff」都要把 jsdiff 的结果渲染成
 * 带 +/- 前缀的纯文本。按 DEVELOPMENT.md §8.4「工具之间禁止互相 import，
 * 共用逻辑一律上提到 lib」，这里只放与 UI 无关的纯函数。
 */
import { diffChars, diffLines } from 'diff'

/** 对比粒度 */
export type DiffMode = 'line' | 'char'

/** 取 jsdiff 的差异片段：行级或字符级 */
export function changesOf(before: string, after: string, mode: DiffMode) {
  return mode === 'char' ? diffChars(before, after) : diffLines(before, after)
}

/**
 * 渲染成带标记的差异文本：+ 新增、- 删除、行首空格表示未变。
 * 这是 diff 工具通用的纯文本约定（不是可直接 git apply 的补丁）。
 */
export function signedDiff(before: string, after: string, mode: DiffMode): string {
  const lines: string[] = []
  for (const change of changesOf(before, after, mode)) {
    if (!change.value) continue
    const sign = change.added ? '+' : change.removed ? '-' : ' '
    // diffLines 的每个片段都以换行结尾，去掉末尾那个再按行拆，避免多出空行
    const value = change.value.endsWith('\n') ? change.value.slice(0, -1) : change.value
    for (const line of value.split('\n')) lines.push(sign + ' ' + line)
  }
  return lines.join('\n')
}
