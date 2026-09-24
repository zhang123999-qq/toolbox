import { signedDiff } from '../../lib/diff'
import type { TextDiffInput, TextDiffOptions } from './schema'

/**
 * 两段文本差异对比：行级用 diffLines，字符级用 diffChars。
 * 渲染复用 lib/diff（与 #36 多文件 Diff 共用同一套标记口径）。
 */
export function transform(input: TextDiffInput, options: TextDiffOptions): string {
  return signedDiff(input.text, input.textB, options.mode)
}
