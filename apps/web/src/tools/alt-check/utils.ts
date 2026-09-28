import { MAX_INPUT } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class AltCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AltCheckError'
  }
}

/** alt 建议长度上限（屏幕阅读器友好值） */
export const ALT_MAX_LENGTH = 125

export interface PageImage {
  /** 文档中的出现顺序（从 1 开始） */
  readonly index: number
  readonly src: string
  /** null 表示标签上没有写 alt 属性 */
  readonly alt: string | null
}

/** 取标签属性值（支持双引号 / 单引号 / 无引号），缺失返回 null */
function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  const m = re.exec(tag)
  if (!m) return null
  // 正则三选一必有其一命中，m[3] 在前两者都未命中时必定有值
  return m[1] ?? m[2] ?? (m[3] as string)
}

/** 从 HTML 中按文档顺序提取 img（纯函数，可单测） */
export function extractImages(html: string): PageImage[] {
  const images: PageImage[] = []
  const re = /<img\b[^>]*>/gi
  let m: RegExpExecArray | null
  let index = 0
  while ((m = re.exec(html)) !== null) {
    index += 1
    images.push({ index, src: getAttr(m[0], 'src') ?? '', alt: getAttr(m[0], 'alt') })
  }
  return images
}

/** alt 是否疑似文件名而非内容描述 */
export function isFilenameLike(alt: string): boolean {
  const t = alt.trim()
  if (/\.(jpe?g|png|gif|webp|svg|bmp|avif|ico)$/i.test(t)) return true
  return /^(img|dsc|dscn|photo|picture|image|screenshot|截屏|图片|未命名)[-_ ]?\d*$/i.test(t)
}

/** 把文本切成词：拉丁词（≥2 字母）+ 中文双字词 */
function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const m of text.toLowerCase().matchAll(/[a-z]{2,}/g)) tokens.push(m[0])
  const cjk = text.replace(/[^\u4e00-\u9fff]/g, '')
  for (let i = 0; i + 2 <= cjk.length; i++) tokens.push(cjk.slice(i, i + 2))
  return tokens
}

/** 同一词出现 ≥4 次视为关键词堆砌，返回该词；无则返回 null */
export function findStuffedWord(alt: string): string | null {
  const counts = new Map<string, number>()
  for (const token of tokenize(alt)) {
    const n = (counts.get(token) ?? 0) + 1
    counts.set(token, n)
    if (n >= 4) return token
  }
  return null
}

export interface AltItemResult {
  readonly index: number
  readonly src: string
  readonly alt: string | null
  readonly issues: readonly string[]
}

export interface AltCheckResult {
  readonly total: number
  readonly passCount: number
  readonly passRate: number
  readonly missing: number
  readonly empty: number
  readonly items: readonly AltItemResult[]
}

/** 检查每张图片的 alt（纯函数，可单测） */
export function checkAlts(images: readonly PageImage[]): AltCheckResult {
  const items: AltItemResult[] = []
  let missing = 0
  let empty = 0
  for (const img of images) {
    const issues: string[] = []
    if (img.alt === null) {
      issues.push('缺少 alt 属性：请补充描述图片内容的替代文本')
      missing += 1
    } else if (img.alt.trim() === '') {
      issues.push('alt 为空：装饰性图片可保留空 alt，内容图片请补充描述')
      empty += 1
    } else {
      const alt = img.alt
      if ([...alt].length > ALT_MAX_LENGTH) {
        issues.push(`alt 过长（${[...alt].length} 字符），建议不超过 ${ALT_MAX_LENGTH} 字符`)
      }
      if (isFilenameLike(alt)) {
        issues.push('alt 疑似文件名（如 IMG_001.jpg），请改为描述图片内容的文字')
      }
      const stuffed = findStuffedWord(alt)
      if (stuffed !== null) {
        issues.push(`alt 疑似关键词堆砌：「${stuffed}」多次重复，请改写为自然描述`)
      }
    }
    items.push({ index: img.index, src: img.src, alt: img.alt, issues })
  }
  const passCount = items.filter((i) => i.issues.length === 0).length
  return {
    total: images.length,
    passCount,
    passRate: images.length === 0 ? 1 : passCount / images.length,
    missing,
    empty,
    items,
  }
}

/** 渲染检查报告文本（复制 / 下载用） */
export function renderReport(result: AltCheckResult): string {
  const lines: string[] = []
  lines.push(
    `图片总数：${result.total}\u3000通过：${result.passCount}\u3000通过率：${Math.round(result.passRate * 100)}%`,
  )
  lines.push(`缺少 alt：${result.missing}\u3000alt 为空：${result.empty}`)
  const bad = result.items.filter((i) => i.issues.length > 0)
  if (bad.length === 0) {
    lines.push('未发现问题，所有图片的 alt 均符合要求')
  } else {
    lines.push('')
    lines.push('问题清单：')
    for (const item of bad) {
      const altText = item.alt === null ? '（无 alt 属性）' : `「${item.alt}」`
      lines.push(`  [${item.index}] ${item.src === '' ? '（无 src）' : item.src} alt=${altText}`)
      for (const issue of item.issues) lines.push(`      - ${issue}`)
    }
  }
  return lines.join('\n')
}

/** 入口：校验 HTML 并返回提取与检查结果 */
export function analyzeHtml(html: string): { images: PageImage[]; result: AltCheckResult } {
  const trimmed = html.trim()
  if (trimmed === '') throw new AltCheckError('请粘贴页面的 HTML 源码')
  if (trimmed.length > MAX_INPUT) throw new AltCheckError(`输入超过 ${MAX_INPUT} 字符上限`)
  const images = extractImages(trimmed)
  if (images.length === 0) throw new AltCheckError('未在 HTML 中找到任何 <img> 标签')
  return { images, result: checkAlts(images) }
}
