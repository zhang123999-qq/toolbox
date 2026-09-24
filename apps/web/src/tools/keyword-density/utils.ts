import { isStopWord, splitWords } from '../../lib/text'
import type { KeywordDensityInput, KeywordDensityOptions } from './schema'

export interface DensityItem {
  word: string
  count: number
  /** 占总词数的百分比 */
  density: number
}

/** 关键词密度：默认过滤停用词，因为虚词占比高但对 SEO 无意义 */
export function density(text: string, topN: number): DensityItem[] {
  const raw = splitWords(text)
  const total = raw.length || 1
  const counter = new Map<string, number>()

  for (const word of raw) {
    if (isStopWord(word)) continue
    const key = word.toLowerCase()
    counter.set(key, (counter.get(key) ?? 0) + 1)
  }

  return [...counter.entries()]
    .map(([word, count]) => ({ word, count, density: (count / total) * 100 }))
    .sort((a, b) => (b.count === a.count ? a.word.localeCompare(b.word) : b.count - a.count))
    .slice(0, Math.max(1, topN))
}

export function transform(input: KeywordDensityInput, options: KeywordDensityOptions): string {
  if (input.text.trim() === '') return ''
  const items = density(input.text, Number(options.topN))
  if (items.length === 0) return '（过滤停用词后没有剩余词）'

  const rows = items.map(
    (item) => item.word + '：' + item.count + ' 次，密度 ' + item.density.toFixed(2) + '%',
  )
  return rows.join('\n')
}
