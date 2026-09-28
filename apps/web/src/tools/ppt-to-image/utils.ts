import { unzipSync } from 'fflate'

/**
 * 本文件只放纯函数：文件校验、pptx 解包、slide 文本提取、
 * 文本换行与幻灯片版式计算（measure 回调由调用方注入 canvas）。
 * fflate 解包是同步纯操作，可直接放 utils；Tool.tsx 只负责文件读取与 canvas 绘制。
 */

/** 单文件上限：50 MiB */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export interface SlideText {
  /** 1 起的幻灯片序号 */
  readonly index: number
  /** 第一行文本（标题，无文本时为空串） */
  readonly title: string
  /** 全部文本段落 */
  readonly paragraphs: readonly string[]
}

export interface PptPreview {
  readonly fileName: string
  readonly slides: readonly SlideText[]
}

/** '960x540' → { width: 960, height: 540 } */
export function parseImageSize(size: string): { readonly width: number; readonly height: number } {
  const [width, height] = size.split('x').map(Number)
  return { width, height }
}

/** 字节数转人类可读：1536 → "1.50 KiB" */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}

/** 校验上传的文件：扩展名 / 空文件 / 体积；不合法抛中文错误 */
export function assertPptxFile(file: { readonly name: string; readonly size: number }): void {
  if (/\.pptx$/i.test(file.name)) {
    // 合法扩展名，继续走体积校验
  } else if (/\.ppt$/i.test(file.name)) {
    throw new Error('暂不支持旧版 .ppt 格式，请先在 PowerPoint / WPS 中另存为 .pptx 后再转换')
  } else {
    throw new Error(`请选择 .pptx 文件（当前文件：${file.name === '' ? '未知' : file.name}）`)
  }
  if (file.size === 0) throw new Error('文件为空，请选择有效的 .pptx 文件')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限`)
  }
}

/** XML 反转义：&lt; &gt; &quot; &apos; 先行，&amp; 必须最后 */
export function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/**
 * 从 slide XML 抽取段落文本：按 <a:p> 分段，段内拼接全部 <a:t>。
 * 空段落跳过（无文本的占位符不进入渲染）。
 */
export function extractSlideParagraphs(slideXml: string): string[] {
  const paragraphs: string[] = []
  const paraRe = /<a:p[\s>][\s\S]*?<\/a:p>/g
  let para: RegExpExecArray | null
  while ((para = paraRe.exec(slideXml)) !== null) {
    const texts: string[] = []
    const textRe = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g
    let run: RegExpExecArray | null
    while ((run = textRe.exec(para[0])) !== null) texts.push(unescapeXml(run[1]))
    const joined = texts.join('').trim()
    if (joined !== '') paragraphs.push(joined)
  }
  return paragraphs
}

const SLDID_RE = /<p:sldId\b[^>]*?\br:id="([^"]+)"[^>]*>/g
const REL_RE = /<Relationship\b(?=[^>]*\bId="([^"]+)")(?=[^>]*\bTarget="([^"]+)")[^>]*>/g

/** rels Target 相对 ppt/ 解析为包内完整路径 */
function resolveTarget(target: string): string {
  const clean = target.replace(/^(\.\.\/)+/, '')
  return clean.startsWith('ppt/') ? clean : `ppt/${clean}`
}

/**
 * presentation.xml + 其 rels → 按播放顺序的 slide 包内路径。
 * rels 中缺失的 sldId 引用会被跳过（容忍损坏文件）。
 */
export function slidePathsInOrder(presentationXml: string, relsXml: string): string[] {
  const idToTarget = new Map<string, string>()
  let rel: RegExpExecArray | null
  while ((rel = REL_RE.exec(relsXml)) !== null) {
    idToTarget.set(rel[1], rel[2])
  }
  const paths: string[] = []
  let sldId: RegExpExecArray | null
  while ((sldId = SLDID_RE.exec(presentationXml)) !== null) {
    const target = idToTarget.get(sldId[1])
    if (target !== undefined) paths.push(resolveTarget(target))
  }
  return paths
}

/** 取 zip 包内文本条目：缺失时抛中文错误（注明缺失的部件） */
function textOf(files: Record<string, Uint8Array>, entry: string): string {
  const data = files[entry]
  if (data === undefined) throw new Error(`文件损坏：缺少 ${entry}`)
  return new TextDecoder().decode(data)
}

/**
 * pptx 字节 → 幻灯片文本模型。
 * pptx 本质是 zip：按 presentation.xml 的播放顺序逐张提取文本。
 */
export function parsePptxPreview(bytes: Uint8Array, fileName: string): PptPreview {
  if (bytes.length === 0) throw new Error('文件为空，请选择有效的 .pptx 文件')
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new Error('文件解析失败：不是有效的 .pptx 文件（.pptx 本质是 zip 压缩包）')
  }
  const presentationXml = textOf(files, 'ppt/presentation.xml')
  const relsXml = textOf(files, 'ppt/_rels/presentation.xml.rels')
  const paths = slidePathsInOrder(presentationXml, relsXml)
  if (paths.length === 0) throw new Error('演示文稿中没有幻灯片')
  const slides = paths.map((path, i) => {
    const paragraphs = extractSlideParagraphs(textOf(files, path))
    return { index: i + 1, title: paragraphs[0] ?? '', paragraphs }
  })
  return { fileName, slides }
}

/**
 * 贪心换行（按字符，中文友好）：measure 返回字符串宽度。
 * 空文本返回 ['']，保证调用方至少绘制一行。
 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    const next = line + ch
    if (measure(next) > maxWidth && line !== '') {
      lines.push(line)
      line = ch
    } else {
      line = next
    }
  }
  // 循环结束后 line 必非空（非空文本的字符都会进入 line）；
  // 空文本则循环不执行，直接 push 得到 [''] —— 无需防御分支。
  lines.push(line)
  return lines
}

export interface SlideImageOptions {
  readonly width: number
  readonly height: number
  readonly background: 'white' | 'dark'
}

export interface ImageTextLine {
  readonly text: string
  readonly x: number
  /** 该行基线的 y 坐标 */
  readonly y: number
  readonly fontSize: number
  readonly bold: boolean
  readonly color: string
}

export interface SlideImageLayout {
  readonly width: number
  readonly height: number
  readonly background: string
  /** 空白幻灯片时为 true，lines 为空，调用方绘制居中占位文案 */
  readonly empty: boolean
  readonly lines: readonly ImageTextLine[]
  readonly placeholderColor: string
}

/**
 * 幻灯片 → 文本版式：标题置顶、正文段落依次向下，超出画布高度时截断。
 * measure 由调用方注入（浏览器里用 canvas 2d 的 measureText）。
 */
export function layoutSlideImage(
  slide: SlideText,
  options: SlideImageOptions,
  measure: (text: string, fontSize: number, bold: boolean) => number,
): SlideImageLayout {
  const { width, height } = options
  const dark = options.background === 'dark'
  const background = dark ? '#1e293b' : '#ffffff'
  const titleColor = dark ? '#f8fafc' : '#0f172a'
  const textColor = dark ? '#cbd5e1' : '#334155'
  const placeholderColor = dark ? '#64748b' : '#94a3b8'

  if (slide.paragraphs.length === 0) {
    return { width, height, background, empty: true, lines: [], placeholderColor }
  }

  const margin = Math.round(width * 0.06)
  const maxWidth = width - margin * 2
  const titleSize = Math.round(height * 0.075)
  const bodySize = Math.round(height * 0.045)
  const lines: ImageTextLine[] = []
  const hasTitle = slide.title !== ''
  let y = margin + (hasTitle ? titleSize : bodySize)

  if (hasTitle) {
    const wrapped = wrapText(slide.title, maxWidth, (t) => measure(t, titleSize, true))
    for (const text of wrapped) {
      if (y > height - margin) break
      lines.push({ text, x: margin, y, fontSize: titleSize, bold: true, color: titleColor })
      y += titleSize * 1.4
    }
    y += titleSize * 0.6
  }

  for (const para of slide.paragraphs.slice(slide.title !== '' ? 1 : 0)) {
    const wrapped = wrapText(para, maxWidth, (t) => measure(t, bodySize, false))
    for (const text of wrapped) {
      if (y > height - margin) break
      lines.push({ text, x: margin, y, fontSize: bodySize, bold: false, color: textColor })
      y += bodySize * 1.6
    }
    y += bodySize * 0.8
  }

  return { width, height, background, empty: false, lines, placeholderColor }
}
