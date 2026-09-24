import { chat } from '../../lib/ai'
import { isStopWord, splitWords } from '../../lib/text'
import type { SummarizeInput, SummarizeOptions } from './schema'

/** 按句切分：中英文句末标点都认，标点留在句尾 */
export function splitSentences(text: string): string[] {
  return (text.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== '')
}

/** 句子打分：词频加权后按长度归一，停用词不参与计分 */
export function scoreSentences(sentences: readonly string[]): number[] {
  const freq = new Map<string, number>()
  for (const sentence of sentences) {
    for (const word of splitWords(sentence)) {
      if (isStopWord(word)) continue
      freq.set(word, (freq.get(word) ?? 0) + 1)
    }
  }
  return sentences.map((sentence) => {
    const words = splitWords(sentence)
    if (words.length === 0) return 0
    const total = words.reduce((sum, word) => sum + (freq.get(word) ?? 0), 0)
    return total / words.length
  })
}

/** 提取式摘要：按分数取前 N 句，再按原文顺序排回去 */
export function extractive(text: string, count: number): string {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return ''
  const scores = scoreSentences(sentences)
  return sentences
    .map((sentence, index) => ({ sentence, index, score: scores[index] }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(1, count))
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence)
    .join('')
}

/**
 * 摘要：extractive 在本地按词频抽句，abstractive 调你自备的模型接口。
 * 两种模式都先做空输入短路，避免为空白内容付接口费。
 */
export async function transform(input: SummarizeInput, options: SummarizeOptions): Promise<string> {
  const text = input.text.trim()
  if (text === '') return ''
  const count = Math.max(1, Number(options.length) || 1)
  if (options.mode === 'extractive') return extractive(text, count)
  return chat(
    { apiBase: input.apiBase, apiKey: input.apiKey, model: input.model },
    '你是摘要助手：只输出摘要正文，不要解释、不要加标题、不要加前后缀。',
    '请把下面的内容压缩成 ' + count + ' 句话以内的摘要：\n\n' + text,
  )
}
