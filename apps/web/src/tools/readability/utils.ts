import { countText, splitWords, syllableCount } from '../../lib/text'
import type { ReadabilityInput } from './schema'

export interface Scores {
  flesch: number
  fkGrade: number
  fog: number
  ari: number
  words: number
  sentences: number
  complexWords: number
  syllables: number
  avgSentenceLength: number
}

/** 计算四项可读性指标；中文词按 1 个音节参与计算，结果仅作参考 */
export function analyze(text: string): Scores {
  const counts = countText(text)
  const words = splitWords(text)
  const w = Math.max(1, words.length)
  const s = Math.max(1, counts.sentences)

  let syllables = 0
  let complexWords = 0
  for (const word of words) {
    const n = syllableCount(word)
    syllables += n
    if (n >= 3) complexWords += 1
  }

  const wps = w / s
  const spw = syllables / w
  return {
    flesch: 206.835 - 1.015 * wps - 84.6 * spw,
    fkGrade: 0.39 * wps + 11.8 * spw - 15.59,
    fog: 0.4 * (wps + 100 * (complexWords / w)),
    ari: 4.71 * (counts.charsNoSpace / w) + 0.5 * wps - 21.43,
    words: words.length,
    sentences: counts.sentences,
    complexWords,
    syllables,
    avgSentenceLength: wps,
  }
}

/** Flesch 分数对应的通俗等级 */
export function fleschLevel(score: number): string {
  if (score >= 90) return '很容易'
  if (score >= 80) return '容易'
  if (score >= 70) return '较容易'
  if (score >= 60) return '普通'
  if (score >= 50) return '较难'
  if (score >= 30) return '难'
  return '很难'
}

export function transform(input: ReadabilityInput): string {
  if (input.text.trim() === '') return ''
  const counts = countText(input.text)
  const s = analyze(input.text)
  const rows = [
    'Flesch 阅读易读度：' + round(s.flesch) + '（' + fleschLevel(s.flesch) + '）',
    'Flesch-Kincaid 年级：' + round(s.fkGrade),
    'Gunning Fog 指数：' + round(s.fog),
    '自动可读性指数 ARI：' + round(s.ari),
    '词数：' + s.words + '｜句数：' + s.sentences + '｜复杂词（≥3 音节）：' + s.complexWords,
    '平均句长：' + round(s.avgSentenceLength) + ' 词/句',
  ]
  if (counts.cjk > 0) {
    rows.push('提示：含中文字符 ' + counts.cjk + ' 个，上述公式基于英文，结果仅供参考')
  }
  return rows.join('\n')
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}
