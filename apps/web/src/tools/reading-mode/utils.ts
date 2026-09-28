/**
 * reading-mode（#739）纯函数：HTML 正文提取与阅读视图数据。
 *
 * 简易正文提取：移除噪音元素后，优先取 article/main，
 * 否则按文本长度打分选择正文容器；DOM 构造可注入（测试用 jsdom）。
 */

export interface ArticleResult {
  readonly title: string
  readonly paragraphs: readonly string[]
  readonly wordCount: number
  /** 预估阅读分钟数（按 400 字/分钟） */
  readonly readingMinutes: number
}

/** HTML → Document 的构造器，可注入（测试用 jsdom 注入或自定义） */
export type DocFactory = (html: string) => Document

function defaultDocFactory(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

/** 噪音元素：不属于正文 */
const NOISE_SELECTOR =
  'script, style, nav, header, footer, aside, form, iframe, noscript, button, input, select, textarea'

function parseHtml(html: string, createDoc: DocFactory = defaultDocFactory): Document {
  if (html.trim() === '') throw new Error('请粘贴要提取正文的 HTML')
  return createDoc(html)
}

/** 统计字数：CJK 字符按字计，拉丁文按词计 */
export function countWords(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf぀-ヿ가-힯]/g) ?? []).length
  const latin = text
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf぀-ヿ가-힯]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0).length
  return cjk + latin
}

/** 从元素中收集段落文本 */
function collectParagraphs(root: Element): string[] {
  const out: string[] = []
  const blocks = root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote')
  blocks.forEach((el) => {
    const text = String(el.textContent).replace(/\s+/g, ' ').trim()
    if (text.length >= 2) out.push(text)
  })
  return out
}

/** 为候选容器打分：文本长度 + 段落数加权 */
function scoreContainer(el: Element): number {
  const text = String(el.textContent).replace(/\s+/g, ' ').trim()
  const pCount = el.querySelectorAll('p').length
  return text.length + pCount * 200
}

/**
 * 提取正文。返回标题、段落、字数与预估阅读时长；
 * 提取不到有效段落时抛中文错。
 */
export function extractArticle(
  html: string,
  createDoc: DocFactory = defaultDocFactory,
): ArticleResult {
  const doc = parseHtml(html, createDoc)
  doc.querySelectorAll(NOISE_SELECTOR).forEach((el) => el.remove())

  const h1 = doc.querySelector('h1')
  const h1Text = h1 === null ? '' : String(h1.textContent).replace(/\s+/g, ' ').trim()
  const cleanTitle = h1Text || doc.title.replace(/\s+/g, ' ').trim() || '未命名文章'

  // 候选容器：article > main > 打分最高的 div/section
  const candidates: Element[] = [
    ...Array.from(doc.querySelectorAll('article')),
    ...Array.from(doc.querySelectorAll('main')),
    ...Array.from(doc.querySelectorAll('div, section')),
  ]
  let best: Element | null = null
  let bestScore = 0
  for (const el of candidates) {
    const s = scoreContainer(el)
    if (s > bestScore) {
      bestScore = s
      best = el
    }
  }
  const root = best ?? doc.body
  const paragraphs = collectParagraphs(root)
  if (paragraphs.length === 0) throw new Error('未能提取到正文：页面缺少有效的段落内容')

  const wordCount = paragraphs.reduce((sum, p) => sum + countWords(p), 0)
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 400))
  return { title: cleanTitle, paragraphs, wordCount, readingMinutes }
}

export type ReadingTheme = 'light' | 'sepia' | 'dark'

export const READING_THEMES: readonly ReadingTheme[] = ['light', 'sepia', 'dark']

/** 校验阅读主题 */
export function validateTheme(theme: string): ReadingTheme {
  if ((READING_THEMES as readonly string[]).includes(theme)) return theme as ReadingTheme
  throw new Error(`主题不合法：${READING_THEMES.join(' / ')}`)
}

/** 校验字号/行高 */
export function validateReadingSize(fontSizePx: number, lineHeight: number): void {
  if (!Number.isFinite(fontSizePx) || fontSizePx < 12 || fontSizePx > 32) {
    throw new Error('阅读字号超出范围：12–32px')
  }
  if (!Number.isFinite(lineHeight) || lineHeight < 1.2 || lineHeight > 2.5) {
    throw new Error('阅读行高超出范围：1.2–2.5')
  }
}
