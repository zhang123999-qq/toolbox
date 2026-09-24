import { chat } from '../../lib/ai'
import { isStopWord } from '../../lib/text'
import type { TagGenInput, TagGenOptions } from './schema'

/** 候选短语长度：汉字 2–4 字 */
const MIN_GRAM = 2
const MAX_GRAM = 4

/** 从一段连续汉字里切出所有 2–4 字候选 */
export function grams(block: string): string[] {
  const out: string[] = []
  for (let size = MIN_GRAM; size <= MAX_GRAM; size += 1) {
    for (let i = 0; i + size <= block.length; i += 1) out.push(block.slice(i, i + size))
  }
  return out
}

/**
 * 本地标签抽取：无词典的 n-gram 频次法。
 * 拉丁词直接按词频；汉字块切 2–4 字候选，按「出现次数 × 长度」排序后剔除被更长候选包含的片段。
 */
export function localTags(text: string, limit: number): string[] {
  const freq = new Map<string, number>()
  const bump = (word: string) => freq.set(word, (freq.get(word) ?? 0) + 1)

  for (const token of text.match(/[A-Za-zÀ-ɏ]+|[-㐀-䶿一-鿿豈-﫿]+/g) ?? []) {
    if (/^[A-Za-zÀ-ɏ]/.test(token)) {
      const word = token.toLowerCase()
      if (word.length < 2 || isStopWord(word)) continue
      bump(word)
      continue
    }
    for (const gram of grams(token)) {
      if (isStopWord(gram)) continue
      bump(gram)
    }
  }

  const ranked = [...freq.entries()]
    // 出现一次的短语不足以称为标签
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] * b[0].length - a[1] * a[0].length || b[0].length - a[0].length)

  const kept: string[] = []
  for (const [word] of ranked) {
    // 已经是更长候选的一部分就丢掉，避免「静态」「静态站」这类重复
    if (kept.some((k) => k.includes(word))) continue
    kept.push(word)
    if (kept.length >= limit) break
  }
  return kept
}

/**
 * 生成标签：local 在本地按频次抽短语，ai 调你自备的模型接口。
 * 两种模式都先做空输入短路，避免为空白内容付接口费。
 */
export async function transform(input: TagGenInput, options: TagGenOptions): Promise<string> {
  const text = input.text.trim()
  if (text === '') return ''
  const limit = Math.max(1, Number(options.limit) || 5)
  if (options.mode === 'local') {
    const tags = localTags(text, limit)
    return tags.length === 0
      ? '没有抽到足够重复的短语，可以换更长的正文或改用 ai 模式。'
      : tags.join('\n')
  }
  return chat(
    { apiBase: input.apiBase, apiKey: input.apiKey, model: input.model },
    '你是标签助手：只输出标签，每行一个，不要编号、不要解释、不要加前后缀。',
    '请从下面的内容里提取 ' + limit + ' 个标签：\n\n' + text,
  )
}
