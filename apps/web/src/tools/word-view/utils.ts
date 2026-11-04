/**
 * 本文件只放纯函数：文件校验、mammoth 产出 HTML 的清洗、预览模型组装。
 * mammoth 的动态加载与转换编排在 Tool.tsx（重型库不进 utils）。
 *
 * 清洗器的存在理由：mammoth 只转义正文文本，不校验超链接 href，
 * 恶意 docx 可夹带 javascript: 链接；此处委托共享 sanitizeHtml
 * （DOMPurify）清洗并补 SAFE_HREF 约束后才进 innerHTML。
 */
import { sanitizeHtml as sharedSanitizeHtml } from '../../shared/sanitizeHtml'
import { escapeHtml } from '../../shared/sanitizeHtml'

/** 单文件上限：50 MiB */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

export interface WordPreview {
  readonly fileName: string
  /** 已清洗、可直接渲染的 HTML 片段 */
  readonly html: string
  /** 原始 HTML 中是否包含图片 */
  readonly hasImages: boolean
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
export function assertDocxFile(file: { readonly name: string; readonly size: number }): void {
  if (/\.docx$/i.test(file.name)) {
    // 合法扩展名，继续走体积校验
  } else if (/\.doc$/i.test(file.name)) {
    throw new Error('暂不支持旧版 .doc 格式，请先在 Word / WPS 中另存为 .docx 后再预览')
  } else {
    throw new Error(`请选择 .docx 文件（当前文件：${file.name === '' ? '未知' : file.name}）`)
  }
  if (file.size === 0) throw new Error('文件为空，请选择有效的 .docx 文件')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限`)
  }
}

/** 切出精确的 ArrayBuffer：subarray 的结果 byteOffset 未必为 0 */
export function exactBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/**
 * 清洗统一走共享 sanitizeHtml（DOMPurify）——P1 双重净化器漂移：
 * 删除本地 ALLOWED_TAGS/cleanNode/sanitizeHtml 自研副本，不再自建第二套白名单。
 * 保留原有 SAFE_HREF 约束（http(s)/mailto/#）：共享版允许 tel/相对路径，但
 * mammoth 产出只允许 http(s)/mailto/页内锚点，故在调用处补一层 href 校验。
 */

/** 安全的超链接协议：http(s) / mailto / 页内锚点（原有行为） */
const SAFE_HREF = /^(https?:|mailto:|#)/i

/**
 * 清洗 HTML 片段：委托共享 sanitizeHtml（DOMPurify），再补 SAFE_HREF 约束。
 * 仅对 <a href> 做校验，不自建标签/属性白名单。
 */
export function sanitizeHtml(html: string): string {
  const cleaned = sharedSanitizeHtml(html)
  if (cleaned === '' || !/<a\b/i.test(cleaned)) return cleaned
  return cleaned.replace(/<a\s[^>]*\bhref\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (tag, rawValue) => {
    const value = String(rawValue).replace(/^"(.*)"$|^(.*)$/, '$1')
    if (SAFE_HREF.test(value.trim())) return tag
    return tag.replace(/\s+\bhref\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/i, '')
  })
}

/** HTML 转义：用于文件名等插入文档 <title> 的文本（与共享版实现保持一致） */
export { escapeHtml } from '../../shared/sanitizeHtml'

/** 原始 HTML → 预览模型（清洗 + 图片标记） */
export function buildPreview(fileName: string, rawHtml: string): WordPreview {
  return {
    fileName,
    html: sanitizeHtml(rawHtml),
    hasImages: /<img[\s>]/i.test(rawHtml),
  }
}

/** 预览内容非空校验 */
export function assertNonEmptyPreview(html: string): void {
  if (html.trim() === '') throw new Error('文档中没有可预览的内容')
}

/** 预览模型 → 可下载的独立 HTML 文档 */
export function previewToDocument(preview: WordPreview): string {
  const body = preview.html === '' ? '<p>（文档无可显示内容）</p>' : preview.html
  return (
    '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">' +
    `<title>${escapeHtml(preview.fileName)}</title>` +
    '<style>body{font-family:system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;' +
    'max-width:72ch;margin:2rem auto;padding:0 1rem;line-height:1.75}' +
    'img{max-width:100%}table{border-collapse:collapse}' +
    'td,th{border:1px solid #999;padding:.25rem .5rem;text-align:left}</style>' +
    `</head><body>${body}</body></html>`
  )
}
