import { countText, isCjk } from '../../lib/text'
import type { CnEnInput } from './schema'

export interface LangCounts {
  chinese: number
  englishWords: number
  digits: number
  punctuation: number
  whitespace: number
  other: number
  total: number
}

const DIGIT = /[0-9]/
const PUNCT = /[.,!?;:'"()[\]{}<>\-—…、，。！？；：《》]/

/** 按字符类别分别计数，英文按单词计而非按字母计 */
export function count(text: string): LangCounts {
  const codePoints = [...text]
  let chinese = 0
  let digits = 0
  let punctuation = 0
  let whitespace = 0
  let other = 0

  for (const ch of codePoints) {
    if (isCjk(ch)) chinese += 1
    else if (DIGIT.test(ch)) digits += 1
    else if (/\s/.test(ch)) whitespace += 1
    else if (PUNCT.test(ch)) punctuation += 1
    else other += 1
  }

  return {
    chinese,
    englishWords: countText(text).latinWords,
    digits,
    punctuation,
    whitespace,
    other,
    total: codePoints.length,
  }
}

export function transform(input: CnEnInput): string {
  if (input.text.trim() === '') return ''
  const c = count(input.text)
  return [
    '中文字符：' + c.chinese,
    '英文单词：' + c.englishWords,
    '数字：' + c.digits,
    '标点：' + c.punctuation,
    '空白：' + c.whitespace,
    '其他：' + c.other,
    '合计字符：' + c.total,
  ].join('\n')
}
