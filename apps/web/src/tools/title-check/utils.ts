import type { TitleCheckInput, TitleCheckOptions } from './schema'

/** Google SERP 约在此显示宽度后截断标题 */
const SERP_WIDTH = 60

/** 显示宽度：半角（U+0000–U+00FF）计 1，其余（中文/全角/emoji 等）计 2；按码点遍历 */
export function displayWidth(s: string): number {
  let width = 0
  for (const ch of s) {
    width += (ch.codePointAt(0) as number) <= 0xff ? 1 : 2
  }
  return width
}

export type Rating = '过短' | '合适' | '过长'

/** 按显示宽度评级：<30 过短，30–60 合适，>60 过长（约 60 宽度被 Google SERP 截断） */
export function rateWidth(width: number): Rating {
  if (width < 30) return '过短'
  if (width > 60) return '过长'
  return '合适'
}

/**
 * 分词：英文按非字母数字切分并转小写，连续中文按单字切。
 * 例：'Hello 世界！World' → ['hello', '世', '界', 'world']
 */
export function tokenize(s: string): string[] {
  const tokens = s.toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fff]/g)
  return tokens === null ? [] : tokens
}

/** 出现超过 1 次的词，去重返回，保持首次出现顺序 */
export function findDuplicates(tokens: string[]): string[] {
  const seen = new Set<string>()
  const dups: string[] = []
  for (const t of tokens) {
    if (seen.has(t)) {
      if (!dups.includes(t)) dups.push(t)
    } else {
      seen.add(t)
    }
  }
  return dups
}

/** 按显示宽度截断：fit 的字符保留，超出的整体丢弃（永不拆散一个宽字符），截断处加 '…' */
function truncateWidth(s: string, maxWidth: number): string {
  if (displayWidth(s) <= maxWidth) return s
  let width = 0
  let out = ''
  for (const ch of s) {
    const w = displayWidth(ch)
    if (width + w <= maxWidth) {
      out += ch
      width += w
    }
  }
  return out + '…'
}

export interface TitleAnalysis {
  title: string
  length: number
  width: number
  rating: Rating
  truncated: string
  keyword: string
  keywordFirst: boolean | null
  duplicates: string[]
  hasNumber: boolean
  hasYear: boolean
  suggestions: string[]
}

/** 分析页面标题；空标题抛错。keyword 为空时不检测前置（keywordFirst 为 null）。 */
export function analyzeTitle(title: string, keyword = ''): TitleAnalysis {
  const trimmed = title.trim()
  if (trimmed === '') throw new Error('请输入页面标题')

  const width = displayWidth(trimmed)
  const rating = rateWidth(width)
  const truncated = truncateWidth(trimmed, SERP_WIDTH)

  const kw = keyword.trim()
  let keywordFirst: boolean | null = null
  if (kw !== '') {
    const chars = [...trimmed]
    const half = chars.slice(0, Math.ceil(chars.length / 2)).join('')
    keywordFirst = half.toLowerCase().includes(kw.toLowerCase())
  }

  const duplicates = findDuplicates(tokenize(trimmed))
  const hasNumber = /\d/.test(trimmed)
  const hasYear = /(19|20)\d{2}/.test(trimmed)

  const suggestions: string[] = []
  if (rating === '过短') suggestions.push('标题过短，建议 30–60 显示宽度')
  if (rating === '过长') suggestions.push('标题过长，Google 约 60 宽度后截断，重要信息前置')
  if (keywordFirst === false) suggestions.push('目标关键词未前置，建议放到标题前部')
  if (duplicates.length > 0) suggestions.push(`存在重复词：${duplicates.join('、')}，建议精简`)
  if (!hasNumber) suggestions.push('可考虑加入数字/年份提升点击率')
  if (suggestions.length === 0) suggestions.push('标题长度合适，关键词前置，无重复词')

  return {
    title: trimmed,
    length: [...trimmed].length,
    width,
    rating,
    truncated,
    keyword: kw,
    keywordFirst,
    duplicates,
    hasNumber,
    hasYear,
    suggestions,
  }
}

/** 把分析结果渲染成纯文本报告，供输出 / 复制 / 下载 */
export function renderAnalysis(a: TitleAnalysis): string {
  const lines: string[] = []
  lines.push(`标题：${a.title}`)
  lines.push(`字符数：${a.length}`)
  lines.push(`显示宽度：${a.width}`)
  lines.push(`评级：${a.rating}`)
  if (a.truncated !== a.title) lines.push(`截断预览：${a.truncated}`)
  lines.push(`目标关键词：${a.keyword === '' ? '（未填写）' : a.keyword}`)
  lines.push(
    a.keywordFirst === null ? '关键词前置：未检测' : `关键词前置：${a.keywordFirst ? '是' : '否'}`,
  )
  lines.push(a.duplicates.length > 0 ? `重复词：${a.duplicates.join('、')}` : '重复词：无')
  lines.push(`含数字：${a.hasNumber ? '是' : '否'}`)
  lines.push(`含年份：${a.hasYear ? '是' : '否'}`)
  lines.push('建议：')
  for (const s of a.suggestions) lines.push(`- ${s}`)
  return lines.join('\n')
}

/** 工具入口：空输入返回空串（不进错误态），否则分析并渲染 */
export async function transform(
  input: TitleCheckInput,
  options: TitleCheckOptions,
): Promise<string> {
  if (input.text.trim() === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  return renderAnalysis(analyzeTitle(input.text, options.keyword))
}
