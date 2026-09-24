import type { SensitiveWordsInput, SensitiveWordsOptions } from './schema'

/**
 * 内置示例词库：只收录常见的营销违规与不文明用词，纯本地匹配。
 * 维护方式：直接增删下面这个数组，无需改动其它代码。
 */
export const WORD_LIST: readonly string[] = [
  '加微信',
  '免费领取',
  '点击链接',
  '扫码添加',
  '限时优惠',
  '名额有限',
  '包过',
  '代刷',
  '发票',
  '博彩',
  '贷款',
  '垃圾',
  '骗子',
  '废物',
  '滚蛋',
]

export interface Hit {
  word: string
  count: number
}

/** 统计每个词出现次数（不处理重叠，够用且结果可预期） */
export function scan(text: string): Hit[] {
  const hits: Hit[] = []
  for (const word of WORD_LIST) {
    let count = 0
    let from = 0
    for (;;) {
      const at = text.indexOf(word, from)
      if (at === -1) break
      count += 1
      from = at + word.length
    }
    if (count > 0) hits.push({ word, count })
  }
  return hits.sort((a, b) => b.count - a.count)
}

/** 命中词替换为 ***（mask）或用【】包裹（高亮） */
export function mark(text: string, mask: boolean): string {
  let out = text
  for (const word of WORD_LIST) {
    out = out.split(word).join(mask ? '*'.repeat(word.length) : '【' + word + '】')
  }
  return out
}

export function transform(input: SensitiveWordsInput, options: SensitiveWordsOptions): string {
  if (input.text.trim() === '') return ''
  const hits = scan(input.text)
  const total = hits.reduce((sum, hit) => sum + hit.count, 0)

  const rows: string[] = []
  rows.push('命中 ' + hits.length + ' 个词，共 ' + total + ' 次')
  if (hits.length > 0) {
    for (const hit of hits) rows.push('- ' + hit.word + ' × ' + hit.count)
  }
  rows.push('')
  rows.push(options.mask ? '打码后的文本：' : '高亮后的文本：')
  rows.push(mark(input.text, options.mask))
  return rows.join('\n')
}
