import { changesOf, signedDiff } from '../../lib/diff'
import type { DiffHighlightInput, DiffHighlightOptions } from './schema'

/** DOM 里直接当文本插，先转义掉标签字符 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 把空白显示出来，否则行尾空格的差异肉眼看不见 */
function visible(text: string): string {
  return text.replace(/ /g, '⋅').replace(/\t/g, '→')
}

/**
 * 渲染成带高亮的 HTML：新增用 <ins>、删除用 <del>，未变部分原样输出。
 * 行级模式按段包一层，字符级模式直接内联标记。
 */
export function highlightHtml(input: DiffHighlightInput, options: DiffHighlightOptions): string {
  if (input.text === '' && input.textB === '') return ''
  const parts: string[] = []
  for (const change of changesOf(input.text, input.textB, options.mode)) {
    if (!change.value) continue
    const body = escapeHtml(options.mode === 'char' ? visible(change.value) : change.value)
    if (change.added) parts.push('<ins class="diff-add">' + body + '</ins>')
    else if (change.removed) parts.push('<del class="diff-del">' + body + '</del>')
    else parts.push('<span class="diff-same">' + body + '</span>')
  }
  return '<div class="diff-body">' + parts.join('') + '</div>'
}

/** 纯文本版本：与 #35 文本 Diff 同一套 +/- 约定，便于复制进补丁工具 */
export function plainDiff(input: DiffHighlightInput, options: DiffHighlightOptions): string {
  return signedDiff(input.text, input.textB, options.mode)
}
