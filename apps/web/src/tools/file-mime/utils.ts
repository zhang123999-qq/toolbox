/** 单个文件上限：200 MiB */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 扩展名 → MIME 映射表（常见类型，浏览器端的权威对照） */
export const EXTENSION_TO_MIME: Record<string, string> = {
  // 图片
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff',
  // 文档
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // 压缩
  '.zip': 'application/zip',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/vnd.rar',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  // 音视频
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  // 字体 / 其他
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
}

/** 魔数签名：头字节 → 候选 MIME（与 file-magic 共用思路，这里侧重查询） */
const SIGNATURES: ReadonlyArray<{ magic: number[]; mime: string }> = [
  { magic: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
  { magic: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { magic: [0x47, 0x49, 0x46], mime: 'image/gif' },
  { magic: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // RIFF....WEBP 近似
  { magic: [0x42, 0x4d], mime: 'image/bmp' },
  { magic: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
  { magic: [0x50, 0x4b, 0x03, 0x04], mime: 'application/zip' }, // zip / docx / xlsx / pptx
  { magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], mime: 'application/x-7z-compressed' },
  { magic: [0x52, 0x61, 0x72, 0x21], mime: 'application/vnd.rar' },
  { magic: [0x1f, 0x8b], mime: 'application/gzip' },
  { magic: [0x49, 0x44, 0x33], mime: 'audio/mpeg' }, // ID3
  { magic: [0xff, 0xfb], mime: 'audio/mpeg' },
  { magic: [0x52, 0x49, 0x46, 0x46], mime: 'audio/wav' }, // RIFF 近似
  { magic: [0x4f, 0x67, 0x67, 0x53], mime: 'audio/ogg' },
  { magic: [0x00, 0x00, 0x01, 0xba], mime: 'video/mpeg' },
  { magic: [0x00, 0x00, 0x01, 0xb3], mime: 'video/mpeg' },
]

/** 扩展名归一：补前导点、小写、去空白 */
export function normalizeExtension(raw: string): string {
  const clean = raw.trim().toLowerCase()
  if (clean === '') return ''
  return clean.startsWith('.') ? clean : '.' + clean
}

/** 扩展名 → MIME，未知返回 null */
export function lookupByExtension(raw: string): string | null {
  const ext = normalizeExtension(raw)
  return ext === '' ? null : (EXTENSION_TO_MIME[ext] ?? null)
}

/** 文件头字节 → 猜测的 MIME，未命中返回 null */
export function sniffMime(bytes: Uint8Array): string | null {
  for (const { magic, mime } of SIGNATURES) {
    if (bytes.length >= magic.length && magic.every((byte, i) => bytes[i] === byte)) {
      return mime
    }
  }
  return null
}

/** 从文件名取扩展名 */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot).toLowerCase() : ''
}

/** 校对结论：扩展名是否与文件头一致 */
export function verdict(extension: string, sniffed: string | null): string {
  if (sniffed === null) return '文件头无法识别：扩展名无法校对'
  const declared = extension === '' ? null : (EXTENSION_TO_MIME[extension] ?? null)
  if (declared === null) return `文件头指向 ${sniffed}，但扩展名 ${extension || '（无）'} 未收录`
  if (declared === sniffed) return `一致：扩展名与文件头都指向 ${sniffed}`
  return `不一致：扩展名声明 ${declared}，文件头指向 ${sniffed}，文件可能被改名`
}

/** MIME → 反向列出常用扩展名 */
export function extensionsForMime(mime: string): string[] {
  const lower = mime.trim().toLowerCase()
  return Object.entries(EXTENSION_TO_MIME)
    .filter(([, value]) => value === lower)
    .map(([key]) => key)
    .sort()
}

/** 纯文本扩展名查询：`png` → 结果文本 */
export function lookupText(raw: string): string {
  if (raw.trim() === '') throw new Error('请输入要查询的扩展名，例如 png 或 .png')
  const ext = normalizeExtension(raw)
  const mime = EXTENSION_TO_MIME[ext]
  if (mime === undefined) {
    throw new Error(
      `未收录扩展名「${ext}」：本工具收录了约 ${Object.keys(EXTENSION_TO_MIME).length} 种常见类型`,
    )
  }
  const aliases = extensionsForMime(mime)
    .filter((item) => item !== ext)
    .join('、')
  return [
    `${ext} → ${mime}`,
    aliases === '' ? '没有常用别名扩展名。' : `同 MIME 的常用扩展名：${aliases}`,
  ].join('\n')
}

/** 下载动作的外部依赖（默认走浏览器；单测可注入假实现） */
export interface DownloadHooks {
  readonly createObjectURL: (blob: Blob) => string
  readonly revokeObjectURL: (url: string) => void
  readonly clickAnchor: (url: string, filename: string) => void
}

const browserHooks: DownloadHooks = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  clickAnchor: (url, filename) => {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  },
}

/** 把查询报告下载为 .txt */
export function downloadReport(report: string, hooks: DownloadHooks = browserHooks): void {
  const url = hooks.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
  try {
    hooks.clickAnchor(url, 'mime-lookup.txt')
  } finally {
    hooks.revokeObjectURL(url)
  }
}
/** 文件查询：扩展名对照 + 文件头嗅探 + 校对结论 */
export async function lookupFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${file.size} 字节，超过 ${MAX_FILE_BYTES} 字节上限`)
  }
  if (file.size === 0) throw new Error('文件为空：无法查询 MIME')
  const ext = extensionOf(file.name)
  const byExt = ext === '' ? null : (EXTENSION_TO_MIME[ext] ?? null)
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const sniffed = sniffMime(head)
  const lines = [
    `文件：${file.name}（${file.size} 字节）`,
    `扩展名 ${ext === '' ? '（无）' : ext} → ${byExt ?? '未收录'}`,
    `文件头嗅探 → ${sniffed ?? '无法识别'}`,
    '',
    verdict(ext, sniffed),
  ]
  return lines.join('\n')
}
