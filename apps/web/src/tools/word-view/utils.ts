/**
 * 本文件只放纯函数：文件校验、mammoth 产出 HTML 的清洗、预览模型组装。
 * mammoth 的动态加载与转换编排在 Tool.tsx（重型库不进 utils）。
 *
 * 清洗器的存在理由：mammoth 只转义正文文本，不校验超链接 href，
 * 恶意 docx 可夹带 javascript: 链接；此处做白名单清洗后才进 innerHTML。
 */

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

/** mammoth 产出允许的标签白名单 */
const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ins',
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',
  'a',
  'img',
  'sup',
  'sub',
  'span',
  'div',
  'figure',
  'figcaption',
])

/** 整体丢弃的标签（含内容）：脚本与内嵌框架不允许出现在预览里 */
const DROP_ENTIRELY: ReadonlySet<string> = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'noscript',
  'title',
])

/** 安全的超链接协议：http(s) / mailto / 页内锚点 */
const SAFE_HREF = /^(https?:|mailto:|#)/i
/** 安全的图片来源：内嵌 data URI 或 http(s) */
const SAFE_IMG_SRC = /^(data:image\/|https?:)/i

function isSafeHref(href: string): boolean {
  return SAFE_HREF.test(href.trim())
}

function isSafeImgSrc(src: string): boolean {
  return SAFE_IMG_SRC.test(src.trim())
}

/** 递归清洗节点：文本直通；白名单标签保留并过滤属性；其余标签拆包或丢弃 */
function cleanNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === 3) return doc.createTextNode((node as Text).data)
  if (node.nodeType !== 1) return null
  const el = node as Element
  const tag = el.tagName.toLowerCase()
  if (DROP_ENTIRELY.has(tag)) return null
  if (!ALLOWED_TAGS.has(tag)) {
    // 非白名单标签：拆包保留子节点（如 <font>、自定义标签）
    const frag = doc.createDocumentFragment()
    el.childNodes.forEach((child) => {
      const cleaned = cleanNode(child, doc)
      if (cleaned !== null) frag.appendChild(cleaned)
    })
    return frag
  }
  const out = doc.createElement(tag)
  if (tag === 'a') {
    const href = el.getAttribute('href')
    if (href !== null && isSafeHref(href)) out.setAttribute('href', href)
  } else if (tag === 'img') {
    const src = el.getAttribute('src')
    if (src !== null && isSafeImgSrc(src)) out.setAttribute('src', src)
    const alt = el.getAttribute('alt')
    if (alt !== null) out.setAttribute('alt', alt)
  } else if (tag === 'td' || tag === 'th') {
    for (const name of ['colspan', 'rowspan'] as const) {
      const value = el.getAttribute(name)
      if (value !== null && /^\d+$/.test(value)) out.setAttribute(name, value)
    }
  }
  el.childNodes.forEach((child) => {
    const cleaned = cleanNode(child, doc)
    if (cleaned !== null) out.appendChild(cleaned)
  })
  return out
}

/**
 * 清洗 HTML 片段：只保留白名单标签，中和危险链接与脚本。
 * 纯函数（DOM 操作无副作用），可在 jsdom / 浏览器中运行。
 */
export function sanitizeHtml(html: string): string {
  if (html.trim() === '') return ''
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const host = parsed.createElement('div')
  parsed.body.childNodes.forEach((child) => {
    const cleaned = cleanNode(child, parsed)
    if (cleaned !== null) host.appendChild(cleaned)
  })
  return host.innerHTML
}

/** HTML 转义：用于文件名等插入文档 <title> 的文本 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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
