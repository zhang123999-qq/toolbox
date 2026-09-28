import type { WordcloudInput } from './schema'

/** 词频：词 + 出现次数 */
export interface WordFreq {
  readonly text: string
  readonly count: number
}

/** 布局后的词：画布坐标（中心点）、字号、旋转角、颜色 */
export interface PlacedWord {
  readonly text: string
  readonly x: number
  readonly y: number
  readonly size: number
  readonly rotate: number
  readonly color: string
}

/** 布局选项：seed 可注入，保证测试确定性 */
export interface LayoutOptions {
  readonly width: number
  readonly height: number
  readonly seed: number
  readonly minSize: number
  readonly maxSize: number
}

/** 内置示例文本（中英混合） */
export const EXAMPLE_TEXT = `数据可视化让信息更直观，词云是文本可视化的经典形式。
Word cloud visualizes text data. Data visualization makes information intuitive.`

/** 固定调色板：按词频顺序取色，测试确定 */
export const PALETTE: readonly string[] = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
]

/** 英文停用词（小写） */
const EN_STOPWORDS: ReadonlySet<string> = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'in',
  'on',
  'for',
  'with',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'it',
  'its',
  'this',
  'that',
  'as',
  'by',
  'at',
  'from',
  'into',
  'we',
  'you',
  'he',
  'she',
  'they',
])

/** 中文停用单字 */
const ZH_STOPWORDS: ReadonlySet<string> = new Set([
  '的',
  '了',
  '在',
  '是',
  '有',
  '和',
  '与',
  '或',
  '就',
  '都',
  '而',
  '及',
  '我',
  '你',
  '他',
  '她',
  '它',
  '们',
  '这',
  '那',
  '个',
  '为',
  '之',
  '被',
])

/**
 * 按序号取色（循环使用调色板）。
 * 纯函数：无分支。
 */
export function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

/**
 * 分词：英文按单词（≥2 字母，转小写）、中文按单字；过滤中英文停用词。
 * 纯函数。
 */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const m of text.toLowerCase().matchAll(/[a-z]{2,}/g)) {
    if (!EN_STOPWORDS.has(m[0])) tokens.push(m[0])
  }
  for (const m of text.matchAll(/[\u4e00-\u9fff]/g)) {
    if (!ZH_STOPWORDS.has(m[0])) tokens.push(m[0])
  }
  return tokens
}

/**
 * 统计词频并取 Top N：按次数降序，次数相同按词典序，保证确定性。
 * 纯函数：topN 非 1–500 的整数抛中文错；空 token 返回空数组。
 */
export function countWords(tokens: string[], topN: number): WordFreq[] {
  if (!Number.isInteger(topN) || topN < 1 || topN > 500) {
    throw new Error(`显示词数非法：${topN}（须为 1–500 的整数）`)
  }
  const freq = new Map<string, number>()
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1)
  const arr: WordFreq[] = [...freq.entries()].map(([text, count]) => ({ text, count }))
  arr.sort((a, b) => b.count - a.count || (a.text < b.text ? -1 : 1))
  return arr.slice(0, topN)
}

/**
 * mulberry32 种子随机数发生器（返回 [0, 1)）。
 * 纯函数：无分支。
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 估算词宽：中文单字按字号计，拉丁字符按 0.6 字号计 */
function estimateWidth(text: string, size: number): number {
  let w = 0
  for (const ch of text) {
    w += /[\u4e00-\u9fff]/.test(ch) ? size : size * 0.6
  }
  return w
}

interface Box {
  readonly x0: number
  readonly y0: number
  readonly x1: number
  readonly y1: number
}

/** 矩形相交判定（含 2px 间距） */
function overlaps(a: Box, b: Box): boolean {
  const gap = 2
  return a.x0 < b.x1 + gap && a.x1 + gap > b.x0 && a.y0 < b.y1 + gap && a.y1 + gap > b.y0
}

const MAX_ATTEMPTS = 720
const ANGLE_STEP = 0.35
const RADIUS_STEP = 1.6

/**
 * 阿基米德螺旋布局：词按词频从大到小依次放置，字号按词频线性映射。
 * 纯函数（不触碰 DOM / canvas）：seed 决定起始角与旋转，相同 seed 结果完全一致。
 * width/height/minSize 非正、minSize > maxSize 抛中文错；空输入返回空数组；
 * 放不下的词会被跳过（不抛错）。
 */
export function layoutCloud(words: readonly WordFreq[], opts: LayoutOptions): PlacedWord[] {
  const { width, height, seed, minSize, maxSize } = opts
  if (!(width > 0) || !(height > 0)) {
    throw new Error(`画布尺寸非法：${width}×${height}（宽高须为正数）`)
  }
  if (!(minSize > 0) || !(maxSize > 0)) {
    throw new Error(`字号非法：${minSize}–${maxSize}（须为正数）`)
  }
  if (minSize > maxSize) {
    throw new Error(`字号区间非法：最小字号 ${minSize} 大于最大字号 ${maxSize}`)
  }
  if (words.length === 0) return []

  const counts = words.map((w) => w.count)
  const minCount = Math.min(...counts)
  const maxCount = Math.max(...counts)
  const rng = mulberry32(seed)
  const cx = width / 2
  const cy = height / 2
  const placed: PlacedWord[] = []
  const boxes: Box[] = []

  words.forEach((word, index) => {
    const ratio = maxCount === minCount ? 1 : (word.count - minCount) / (maxCount - minCount)
    const size = Math.round(minSize + (maxSize - minSize) * ratio)
    const rotate = rng() < 0.25 ? -90 : 0
    const rawW = estimateWidth(word.text, size)
    const rawH = size
    const w = rotate === 0 ? rawW : rawH
    const h = rotate === 0 ? rawH : rawW
    let angle = rng() * Math.PI * 2
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const r = i * RADIUS_STEP
      const x = cx + r * Math.cos(angle)
      const y = cy + r * Math.sin(angle)
      angle += ANGLE_STEP
      const box: Box = { x0: x - w / 2, y0: y - h / 2, x1: x + w / 2, y1: y + h / 2 }
      const inside = box.x0 >= 0 && box.y0 >= 0 && box.x1 <= width && box.y1 <= height
      if (!inside) continue
      if (boxes.some((b) => overlaps(b, box))) continue
      boxes.push(box)
      placed.push({ text: word.text, x, y, size, rotate, color: colorFor(index) })
      break
    }
    // 放不下则跳过该词
  })
  return placed
}

/** 解析显示词数：1–500，留空回 fallback */
export function parseTopN(raw: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isInteger(n)) throw new Error(`显示词数格式非法：${v}（须为整数）`)
  if (n < 1 || n > 500) throw new Error(`显示词数须在 1–500 之间（当前 ${v}）`)
  return n
}

/** 解析画布尺寸：100–2000，留空回 fallback */
export function parseSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 100 || n > 2000) throw new Error(`${name}须在 100–2000 之间（当前 ${v}）`)
  return n
}

/** 解析字号：6–200，留空回 fallback */
export function parseFontSize(raw: string, name: string, fallback: number): number {
  const v = raw.trim()
  if (v === '') return fallback
  const n = Number(v)
  if (!Number.isFinite(n)) throw new Error(`${name}格式非法：${v}（须为数字）`)
  if (n < 6 || n > 200) throw new Error(`${name}须在 6–200 之间（当前 ${v}）`)
  return n
}

/** T3 toText 入口：空输入用示例文本 */
export function transform(input: WordcloudInput): string {
  const text = input.text.trim()
  if (text === '') return EXAMPLE_TEXT
  return text
}
