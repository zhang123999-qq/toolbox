import { changesOf } from '../../lib/diff'
import type { TextCompareInput, TextCompareOptions } from './schema'

/** 编辑距离（Levenshtein）：滚动数组，只留一行，内存 O(min(len)) */
export function editDistance(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[b.length]
}

/** 归一化相似度：1 - 距离 / 较长者长度，取值 0–1 */
export function similarity(a: string, b: string): number {
  const longer = Math.max(a.length, b.length)
  if (longer === 0) return 1
  return 1 - editDistance([...a], [...b]) / longer
}

/** 最长公共前缀长度 */
export function commonPrefix(a: string, b: string): string {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1
  return a.slice(0, i)
}

/** 最长公共后缀长度（不与前缀重叠） */
export function commonSuffix(a: string, b: string): string {
  let i = 0
  while (
    i < a.length &&
    i < b.length &&
    a[a.length - 1 - i] === b[b.length - 1 - i] &&
    i < a.length - commonPrefixLength(a, b)
  ) {
    i += 1
  }
  return a.slice(a.length - i)
}

function commonPrefixLength(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1
  return i
}

/** 逐字符差异：与 #35 / #51 复用同一套 +/- 约定 */
export function charDiff(a: string, b: string): string {
  const out: string[] = []
  for (const change of changesOf(a, b, 'char')) {
    if (!change.value) continue
    const sign = change.added ? '+' : change.removed ? '-' : ' '
    out.push(sign + ' ' + change.value.replace(/\n/g, '⏎'))
  }
  return out.join('\n')
}

/** 比较报告 */
export function transform(input: TextCompareInput, options: TextCompareOptions): string {
  const a = input.text
  const b = input.textB
  if (a === '' && b === '') return ''
  if (options.mode === 'diff') return charDiff(a, b)
  const distance = editDistance([...a], [...b])
  const prefix = commonPrefix(a, b)
  const suffix = commonSuffix(a, b)
  return [
    '相似度：' + (similarity(a, b) * 100).toFixed(1) + '%',
    '编辑距离：' + distance + ' 次单字符编辑',
    '长度：' +
      [...a].length +
      ' / ' +
      [...b].length +
      '（差 ' +
      ([...b].length - [...a].length) +
      '）',
    '公共前缀：' + (prefix === '' ? '（无）' : prefix + '（' + [...prefix].length + ' 字符）'),
    '公共后缀：' + (suffix === '' ? '（无）' : suffix + '（' + [...suffix].length + ' 字符）'),
    a === b ? '两份文本完全相同' : '',
  ]
    .filter((line) => line !== '')
    .join('\n')
}
