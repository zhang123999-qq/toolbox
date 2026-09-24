import { isStopWord, splitWords } from '../../lib/text'
import type { TextStatsInput, TextStatsOptions } from './schema'

/** 图表的横轴标签与柱子高度 */
export interface ChartData {
  readonly labels: string[]
  readonly values: number[]
}

/** 词频：过滤停用词后取前 N */
export function topWords(text: string, limit: number): [string, number][] {
  const freq = new Map<string, number>()
  for (const word of splitWords(text)) {
    const key = word.toLowerCase()
    if (isStopWord(key)) continue
    freq.set(key, (freq.get(key) ?? 0) + 1)
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, limit))
}

/** 长度分布：按行长度分桶，桶宽随内容自适应，最多 12 个桶 */
export function lengthBuckets(text: string): [string, number][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length === 0) return []
  const lengths = lines.map((line) => [...line].length)
  const max = Math.max(...lengths)
  const width = Math.max(1, Math.ceil((max + 1) / 12))
  const buckets = new Map<string, number>()
  for (const length of lengths) {
    const start = Math.floor(length / width) * width
    const label = width === 1 ? String(start) : start + '-' + (start + width - 1)
    buckets.set(label, (buckets.get(label) ?? 0) + 1)
  }
  return [...buckets.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
}

/** 按当前指标取图表数据 */
export function chartData(text: string, options: TextStatsOptions): ChartData {
  const limit = Math.max(1, Number(options.limit) || 10)
  const pairs = options.metric === 'length' ? lengthBuckets(text) : topWords(text, limit)
  return { labels: pairs.map(([label]) => label), values: pairs.map(([, value]) => value) }
}

/** 纯文本版本：图表读不了时（复制、下载、无障碍）靠它 */
export function statsText(input: TextStatsInput, options: TextStatsOptions): string {
  if (input.text.trim() === '') return ''
  const data = chartData(input.text, options)
  if (data.labels.length === 0) return '没有可统计的内容。'
  const title = options.metric === 'length' ? '行长分布（字符数：行数）' : '词频（词：次数）'
  const lines = data.labels.map((label, index) => label + '\t' + data.values[index])
  return [title, ...lines].join('\n')
}
