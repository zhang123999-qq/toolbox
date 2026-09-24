import nlp from 'compromise'
import { countText } from '../../lib/text'
import type { SentimentInput, SentimentOptions } from './schema'

/** 内置褒义词（英文 + 中文），可按需扩充 */
const POSITIVE = new Set([
  'good',
  'great',
  'nice',
  'love',
  'like',
  'excellent',
  'amazing',
  'fast',
  'easy',
  'clean',
  'useful',
  'happy',
  'best',
  'perfect',
  'wonderful',
  'beautiful',
  'recommend',
  '好',
  '很好',
  '喜欢',
  '优秀',
  '棒',
  '赞',
  '方便',
  '实用',
  '推荐',
  '满意',
  '快',
  '漂亮',
])

/** 内置贬义词（英文 + 中文） */
const NEGATIVE = new Set([
  'bad',
  'terrible',
  'hate',
  'awful',
  'slow',
  'broken',
  'bug',
  'confusing',
  'ugly',
  'hard',
  'difficult',
  'worst',
  'poor',
  'useless',
  'fail',
  'error',
  'disappointing',
  '差',
  '很差',
  '讨厌',
  '糟糕',
  '慢',
  '难用',
  '丑',
  '难',
  '失望',
  '垃圾',
  '失败',
  '错误',
])

export interface SentenceScore {
  text: string
  score: number
}

export interface SentimentResult {
  label: string
  score: number
  positive: number
  negative: number
  sentences: SentenceScore[]
}

/** 中文占比超过 20% 视为中文文本 */
export function isChinese(text: string): boolean {
  const counts = countText(text)
  return counts.chars > 0 && counts.cjk / counts.chars > 0.2
}

/** 分句：中文按标点切，英文交给 compromise（它能处理缩写与句点歧义） */
export function splitSentences(text: string, language: string): string[] {
  const zh = language === 'zh' || (language === 'auto' && isChinese(text))
  if (zh) {
    return text
      .split(/[。！？；!?;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s !== '')
  }
  const raw = nlp(text).sentences().out('array')
  const list: string[] = Array.isArray(raw) ? raw.map((s) => String(s).trim()) : []
  return list.filter((s) => s !== '')
}

/** 单个词的极性：1 褒义 / -1 贬义 / 0 中性 */
export function polarity(word: string): number {
  const lower = word.toLowerCase()
  if (POSITIVE.has(lower)) return 1
  if (NEGATIVE.has(lower)) return -1
  return 0
}

export function analyze(text: string, language: string): SentimentResult {
  const sentences = splitSentences(text, language)
  const scored: SentenceScore[] = []
  let positive = 0
  let negative = 0

  for (const sentence of sentences) {
    const zh = language === 'zh' || (language === 'auto' && isChinese(sentence))
    let pos = 0
    let neg = 0
    if (zh) {
      // 中文按子串包含匹配（无分词器，够用且结果可预期）
      for (const word of POSITIVE) if (sentence.includes(word)) pos += 1
      for (const word of NEGATIVE) if (sentence.includes(word)) neg += 1
    } else {
      const words = sentence.split(/[^A-Za-z']+/).filter((w) => w !== '')
      for (const word of words) {
        const p = polarity(word)
        if (p > 0) pos += 1
        if (p < 0) neg += 1
      }
    }
    positive += pos
    negative += neg
    const total = pos + neg
    scored.push({ text: sentence, score: total === 0 ? 0 : (pos - neg) / total })
  }

  const total = positive + negative
  const score = total === 0 ? 0 : (positive - negative) / total
  return { label: labelOf(score), score, positive, negative, sentences: scored }
}

/** 得分 → 倾向标签 */
export function labelOf(score: number): string {
  if (score > 0.15) return '正面'
  if (score < -0.15) return '负面'
  return '中性'
}

export function transform(input: SentimentInput, options: SentimentOptions): string {
  if (input.text.trim() === '') return ''
  const result = analyze(input.text, options.language)
  const rows = [
    '情感倾向：' + result.label + '（得分 ' + result.score.toFixed(2) + '）',
    '褒义词 ' + result.positive + ' 个，贬义词 ' + result.negative + ' 个',
    '',
    '逐句得分：',
  ]
  result.sentences.forEach((item, index) => {
    rows.push(index + 1 + '. [' + signed(item.score) + '] ' + item.text)
  })
  return rows.join('\n')
}

function signed(score: number): string {
  return (score > 0 ? '+' : '') + score.toFixed(2)
}
