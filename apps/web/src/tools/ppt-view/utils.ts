import { unzipSync } from 'fflate'

/**
 * 本文件只放纯函数：文件校验、pptx 解包、slide XML 文本提取。
 * fflate 的解包是同步纯操作，可直接放 utils；Tool.tsx 只负责文件读取与状态。
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
    throw new Error('暂不支持旧版 .ppt 格式，请先在 PowerPoint / WPS 中另存为 .pptx 后再预览')
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
 * 空段落跳过（无文本的占位符不进入预览）。
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
 * pptx 字节 → 预览模型。
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

/** 预览模型 → 可复制/下载的纯文本 */
export function previewToText(preview: PptPreview): string {
  const parts: string[] = [`演示文稿：${preview.fileName}（${preview.slides.length} 张幻灯片）`]
  for (const slide of preview.slides) {
    parts.push('', `--- 第 ${slide.index} 张 ---`)
    if (slide.paragraphs.length === 0) {
      parts.push('（空白幻灯片）')
    } else {
      for (const para of slide.paragraphs) parts.push(para)
    }
  }
  return parts.join('\n')
}

/** 文件入口：校验 → 读字节 → 解包提取 */
export async function previewPptxFile(file: File): Promise<PptPreview> {
  assertPptxFile(file)
  const bytes = new Uint8Array(await file.arrayBuffer())
  return parsePptxPreview(bytes, file.name)
}
