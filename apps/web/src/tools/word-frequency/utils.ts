import { isStopWord, splitWords } from '../../lib/text'
import type { WordFrequencyInput, WordFrequencyOptions } from './schema'

export interface FreqItem {
  word: string
  count: number
  /** 占总词数的百分比 */
  ratio: number
}

/**
 * 统计词频并按次数降序、同次数按字典序排列。
 * 中文按「连续汉字块」切分（未做分词），已在 README 的限制里说明。
 */
export function frequency(
  text: string,
  ignoreCase: boolean,
  useStopWords: boolean,
  topN: number,
): FreqItem[] {
  const raw = splitWords(text)
  const total = raw.length || 1
  const counter = new Map<string, number>()

  for (const word of raw) {
    const key = ignoreCase ? word.toLowerCase() : word
    if (useStopWords && isStopWord(word)) continue
    counter.set(key, (counter.get(key) ?? 0) + 1)
  }

  return [...counter.entries()]
    .map(([word, count]) => ({ word, count, ratio: (count / total) * 100 }))
    .sort((a, b) => (b.count === a.count ? a.word.localeCompare(b.word) : b.count - a.count))
    .slice(0, Math.max(1, topN))
}

export function transform(input: WordFrequencyInput, options: WordFrequencyOptions): string {
  if (input.text.trim() === '') return ''
  const items = frequency(
    input.text,
    options.ignoreCase,
    options.useStopWords,
    Number(options.topN),
  )
  if (items.length === 0) return '（过滤后没有剩余词）'

  return items
    .map(
      (item, index) =>
        index + 1 + '. ' + item.word + '  ' + item.count + '  ' + item.ratio.toFixed(2) + '%',
    )
    .join('\n')
}
