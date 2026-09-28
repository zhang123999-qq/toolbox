import { MAX_INPUT } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class DescCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DescCheckError'
  }
}

/** Google 搜索结果展示的描述宽度参考（显示宽度单位） */
export const WIDTH_TOO_SHORT = 100
export const WIDTH_TOO_LONG = 320

/** 显示宽度：CJK / 全角字符计 2，其余计 1 */
export function displayWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    width += ch > 'ÿ' ? 2 : 1
  }
  return width
}

/** 行动号召（CTA）词表：命中加分 */
const CTA_WORDS = [
  '免费',
  '立即',
  '马上',
  '了解更多',
  '点击',
  '查看详情',
  '下载',
  '注册',
  '免费试用',
  '优惠',
  '限时',
  '抢购',
  '咨询',
  '预约',
  'learn more',
  'free',
  'download',
  'sign up',
  'get started',
  'click',
  'shop now',
  'try free',
  'limited time',
] as const

/** 找出重复词：拉丁词（≥3 字母，出现 ≥3 次）+ 中文双字词（出现 ≥3 次） */
export function findRepeatedWords(text: string): string[] {
  const counts = new Map<string, number>()
  const lower = text.toLowerCase()
  for (const m of lower.matchAll(/[a-z]{3,}/g)) {
    const w = m[0]
    counts.set(w, (counts.get(w) ?? 0) + 1)
  }
  const cjk = text.replace(/[^\u4e00-\u9fff]/g, '')
  for (let i = 0; i + 2 <= cjk.length; i++) {
    const bigram = cjk.slice(i, i + 2)
    counts.set(bigram, (counts.get(bigram) ?? 0) + 1)
  }
  const repeated: string[] = []
  for (const [word, count] of counts) {
    if (count >= 3) repeated.push(word)
  }
  return repeated.sort()
}

/** 找出命中的 CTA 词（去重，保持词表顺序） */
export function findCtaWords(text: string): string[] {
  const lower = text.toLowerCase()
  return CTA_WORDS.filter((w) => lower.includes(w.toLowerCase()))
}

export type LengthRating = '过短' | '合适' | '过长'

export interface DescAnalysis {
  readonly charCount: number
  readonly width: number
  readonly rating: LengthRating
  readonly keyword: string
  readonly keywordFound: boolean
  /** 关键词出现在文本前 1/3 处 */
  readonly keywordFront: boolean
  readonly repeatedWords: readonly string[]
  readonly ctaFound: readonly string[]
  readonly score: number
  readonly suggestions: readonly string[]
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** 分析 meta description（纯函数，可单测） */
export function analyzeDescription(rawText: string, rawKeyword = ''): DescAnalysis {
  const text = rawText.trim()
  if (text === '') throw new DescCheckError('请输入 meta description 文本')
  if (text.length > MAX_INPUT) throw new DescCheckError(`输入超过 ${MAX_INPUT} 字符上限`)
  const keyword = rawKeyword.trim()
  const charCount = [...text].length
  const width = displayWidth(text)
  const rating: LengthRating =
    width < WIDTH_TOO_SHORT ? '过短' : width > WIDTH_TOO_LONG ? '过长' : '合适'

  let keywordFound = false
  let keywordFront = false
  if (keyword !== '') {
    const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
    keywordFound = idx >= 0
    keywordFront = keywordFound && idx <= Math.floor(text.length / 3)
  }

  const repeatedWords = findRepeatedWords(text)
  const ctaFound = findCtaWords(text)

  let score = 100
  if (rating === '过短') score -= 30
  if (rating === '过长') score -= 20
  if (keyword !== '') {
    if (!keywordFound) score -= 15
    else if (!keywordFront) score -= 5
  }
  score -= Math.min(20, repeatedWords.length * 10)
  if (ctaFound.length > 0) score += 5

  const suggestions: string[] = []
  if (rating === '过短')
    suggestions.push(
      '描述过短：建议扩充到约 150–160 个字符（中文约 75–80 字），充分利用搜索结果展示位',
    )
  if (rating === '过长')
    suggestions.push(
      '描述过长：Google 只展示约 155–160 个字符，超出部分会被截断，建议精简到展示范围内',
    )
  if (keyword !== '' && !keywordFound)
    suggestions.push(`未找到目标关键词「${keyword}」：建议在描述中自然融入一次`)
  if (keyword !== '' && keywordFound && !keywordFront)
    suggestions.push('关键词出现位置靠后：建议尽量前置，搜索结果中更容易被注意到')
  for (const w of repeatedWords)
    suggestions.push(`「${w}」重复出现：建议换用同义词或删减，避免关键词堆砌嫌疑`)
  if (ctaFound.length === 0)
    suggestions.push('缺少行动号召：可加入如「免费」「立即了解」等 CTA 词提升点击率')
  if (suggestions.length === 0) suggestions.push('描述长度与结构良好，关键词位置恰当')

  return {
    charCount,
    width,
    rating,
    keyword,
    keywordFound,
    keywordFront,
    repeatedWords,
    ctaFound,
    score: clampScore(score),
    suggestions,
  }
}

/** 渲染分析报告为文本（复制 / 下载用） */
export function renderReport(a: DescAnalysis): string {
  const lines: string[] = []
  lines.push(`字符数：${a.charCount}\u3000显示宽度：${a.width}\u3000长度评级：${a.rating}`)
  if (a.keyword !== '') {
    lines.push(
      `目标关键词「${a.keyword}」：${a.keywordFound ? (a.keywordFront ? '已找到（前置）' : '已找到（位置靠后）') : '未找到'}`,
    )
  }
  lines.push(`重复词：${a.repeatedWords.length > 0 ? a.repeatedWords.join('、') : '无'}`)
  lines.push(`行动号召词：${a.ctaFound.length > 0 ? a.ctaFound.join('、') : '无'}`)
  lines.push(`综合评分：${a.score} / 100`)
  lines.push('')
  lines.push('改写建议：')
  a.suggestions.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`))
  return lines.join('\n')
}
