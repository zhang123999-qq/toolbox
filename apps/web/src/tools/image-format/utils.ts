/**
 * image-format 纯函数：魔数识别、扩展名映射、一致性判定、报告文本构造。
 * 不触碰 DOM/Canvas/File，只做字节判定，可 100% 单测。
 */

/** 魔数可识别的真实格式；未知返回 'unknown' */
export type DetectedFormat =
  'png' | 'jpeg' | 'gif' | 'webp' | 'bmp' | 'ico' | 'avif' | 'svg' | 'unknown'

/** 一致性结论：match=一致 / mismatch=扩展名与内容不符 / unrecognized=无法识别 / noext=无扩展名 */
export type Consistency = 'match' | 'mismatch' | 'unrecognized' | 'noext'

/** 单文件上限 50MB（只读文件头、不解码，但仍限制输入规模） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 批量总数上限 50（只读文件头，内存占用小） */
export const MAX_FILES = 50
/** 读取的文件头字节数：覆盖全部魔数分支（WebP/AVIF 需 12 字节） */
export const HEAD_BYTES = 12

/** 单项检测结果 */
export interface FormatCheckItem {
  fileName: string
  /** 扩展名原文（小写，不含点）；无则 '' */
  declaredExt: string
  /** 浏览器声明的 MIME；无则 '' */
  declaredMime: string
  /** 扩展名期望的格式；无扩展名/未知扩展名时为 null */
  expected: DetectedFormat | null
  /** 魔数检测到的真实格式 */
  detected: DetectedFormat
  consistency: Consistency
}

/** 报告文本所需的静态文案（调用方用 t() 传入，保持 utils 与 i18n 解耦） */
export interface ReportLabels {
  title: string
  fileLabel: string
  declaredLabel: string
  detectedLabel: string
  conclusionLabel: string
  summaryPrefix: string
  summaryUnit: string
  matchText: string
  mismatchText: string
  unrecognizedText: string
  noextText: string
  unknownFormat: string
  noExtension: string
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 字节前缀匹配；字节不足时返回 false（截断文件不会误判） */
function startsWith(bytes: Uint8Array, pattern: number[]): boolean {
  if (bytes.length < pattern.length) return false
  for (let i = 0; i < pattern.length; i++) {
    if (bytes[i] !== pattern[i]) return false
  }
  return true
}

/** 文件头转 Latin-1 文本（用于 SVG 文本头 / AVIF brand 判断） */
function headToText(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return s
}

/** 偏移处 ASCII 文本匹配；字节不足返回 false（截断文件不会误判） */
function magicAt(bytes: Uint8Array, offset: number, text: string): boolean {
  if (bytes.length < offset + text.length) return false
  for (let i = 0; i < text.length; i++) {
    if (bytes[offset + i] !== text.charCodeAt(i)) return false
  }
  return true
}

/**
 * 文件头魔数识别真实格式（读前 12 字节即可）。
 * 分支顺序：二进制魔数优先，文本 SVG 兜底，未知返回 'unknown'。
 */
export function detectFormatByMagic(bytes: Uint8Array): DetectedFormat {
  // PNG：89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  // JPEG：FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  // GIF："GIF8"
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'gif'
  // WebP：RIFF....WEBP（0-3 为 RIFF，8-11 为 WEBP）
  if (magicAt(bytes, 0, 'RIFF') && magicAt(bytes, 8, 'WEBP')) return 'webp'
  // BMP：42 4D
  if (startsWith(bytes, [0x42, 0x4d])) return 'bmp'
  // ICO：00 00 01 00
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return 'ico'
  // AVIF：offset 4 为 "ftyp" 且 brand（offset 8 起 4 字节）含 avif
  if (magicAt(bytes, 4, 'ftyp') && headToText(bytes).slice(8, 12).includes('avif')) return 'avif'
  // SVG：文本头含 <svg
  if (headToText(bytes).includes('<svg')) return 'svg'
  return 'unknown'
}

const EXTENSION_MAP: Record<string, Exclude<DetectedFormat, 'unknown'>> = {
  png: 'png',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  gif: 'gif',
  webp: 'webp',
  bmp: 'bmp',
  ico: 'ico',
  avif: 'avif',
  svg: 'svg',
}

/** 扩展名 → 期望格式；无/未知扩展名返回 null */
export function extensionToFormat(ext: string): Exclude<DetectedFormat, 'unknown'> | null {
  const t = ext.trim().toLowerCase().replace(/^\./, '')
  return EXTENSION_MAP[t] ?? null
}

/** 从文件名取扩展名（不含点，小写）；无则 '' */
export function getExtension(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName.trim())
  return m ? m[1].toLowerCase() : ''
}

/** 格式展示名：PNG/JPEG/GIF/WEBP/BMP/ICO/AVIF/SVG；unknown 由调用方翻译 */
export function formatLabel(format: DetectedFormat): string {
  if (format === 'jpeg') return 'JPEG'
  if (format === 'unknown') return '?'
  return format.toUpperCase()
}

/** 一致性结论文案 */
export function conclusionText(consistency: Consistency, labels: ReportLabels): string {
  switch (consistency) {
    case 'match':
      return labels.matchText
    case 'mismatch':
      return labels.mismatchText
    case 'unrecognized':
      return labels.unrecognizedText
    case 'noext':
      return labels.noextText
  }
}

/**
 * 一致性判定：扩展名期望格式 vs 魔数检测格式。
 * 检测为 unknown → unrecognized；无/未知扩展名 → noext（只报告检测格式）。
 */
export function checkConsistency(
  fileName: string,
  detected: DetectedFormat,
  mime = '',
): FormatCheckItem {
  const declaredExt = getExtension(fileName)
  const expected = declaredExt === '' ? null : extensionToFormat(declaredExt)
  let consistency: Consistency
  if (detected === 'unknown') consistency = 'unrecognized'
  else if (expected === null) consistency = 'noext'
  else consistency = expected === detected ? 'match' : 'mismatch'
  return { fileName, declaredExt, declaredMime: mime, expected, detected, consistency }
}

/** 构造检测报告纯文本 */
export function buildReportText(items: FormatCheckItem[], labels: ReportLabels): string {
  const lines: string[] = [
    labels.title,
    `${labels.summaryPrefix}${items.length}${labels.summaryUnit}`,
  ]
  items.forEach((item, i) => {
    lines.push('')
    lines.push(`[${i + 1}] ${labels.fileLabel}：${item.fileName}`)
    const declared =
      item.declaredExt === ''
        ? labels.noExtension
        : item.declaredMime === ''
          ? item.declaredExt
          : `${item.declaredExt}（${item.declaredMime}）`
    lines.push(`  ${labels.declaredLabel}：${declared}`)
    const detected = item.detected === 'unknown' ? labels.unknownFormat : formatLabel(item.detected)
    lines.push(`  ${labels.detectedLabel}：${detected}`)
    lines.push(`  ${labels.conclusionLabel}：${conclusionText(item.consistency, labels)}`)
  })
  return lines.join('\n')
}

/** 校验单文件大小（50MB 上限） */
export function assertFileSizeOk(name: string, size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件 ${name} 过大：单文件上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验批量总数（50 个上限） */
export function assertFileCountOk(count: number): void {
  if (count > MAX_FILES) {
    throw new Error(`文件过多：批量上限 ${MAX_FILES} 个，请分批检测`)
  }
}
