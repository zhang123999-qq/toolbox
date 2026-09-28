import type { FileMagicInput, FileMagicOptions } from './schema'

/** 单个文件上限：200 MiB */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 只读文件头这么多字节做鉴定 */
export const HEADER_BYTES = 64

/** 鉴定结论 */
export interface MagicResult {
  /** 鉴定出的类型名，未知为 null */
  readonly type: string | null
  /** 建议扩展名 */
  readonly extension: string | null
  /** 命中签名的十六进制头 */
  readonly signature: string
}

interface SignatureEntryBase {
  readonly magic: number[]
  readonly offset?: number
  readonly type: string
  readonly extension: string
}

/** 带 extra 校验的条目必须同时给出 extraAt；不带 extra 的条目不写 extraAt */
type SignatureEntry = SignatureEntryBase &
  (
    | {
        /** magic 命中后，还要在 at 位置校验的额外字节（如 WebP 的 "WEBP" 位于第 8 字节） */
        readonly extra: number[]
        readonly extraAt: number
      }
    | { readonly extra?: undefined; readonly extraAt?: undefined }
  )

const TABLE: SignatureEntry[] = [
  { magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], type: 'PNG 图片', extension: '.png' },
  { magic: [0xff, 0xd8, 0xff], type: 'JPEG 图片', extension: '.jpg' },
  { magic: [0x47, 0x49, 0x46, 0x38], type: 'GIF 图片', extension: '.gif' },
  {
    magic: [0x52, 0x49, 0x46, 0x46],
    extra: [0x57, 0x45, 0x42, 0x50],
    extraAt: 8,
    type: 'WebP 图片（RIFF/WEBP）',
    extension: '.webp',
  },
  { magic: [0x42, 0x4d], type: 'BMP 图片', extension: '.bmp' },
  { magic: [0x25, 0x50, 0x44, 0x46], type: 'PDF 文档', extension: '.pdf' },
  {
    magic: [0x50, 0x4b, 0x03, 0x04],
    type: 'ZIP 压缩包（docx/xlsx/pptx/jar 也是此签名）',
    extension: '.zip',
  },
  { magic: [0x50, 0x4b, 0x05, 0x06], type: 'ZIP 空压缩包', extension: '.zip' },
  { magic: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c], type: '7z 压缩包', extension: '.7z' },
  { magic: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], type: 'RAR 压缩包', extension: '.rar' },
  { magic: [0x1f, 0x8b], type: 'GZIP 压缩包', extension: '.gz' },
  { magic: [0x42, 0x5a, 0x68], type: 'BZIP2 压缩包', extension: '.bz2' },
  { magic: [0x49, 0x44, 0x33], type: 'MP3 音频（含 ID3 标签）', extension: '.mp3' },
  { magic: [0xff, 0xfb], type: 'MP3 音频（裸帧）', extension: '.mp3' },
  { magic: [0x4f, 0x67, 0x67, 0x53], type: 'OGG 音视频', extension: '.ogg' },
  { magic: [0x52, 0x49, 0x46, 0x46], type: 'WAV 音频（RIFF 容器）', extension: '.wav' },
  { magic: [0x66, 0x4c, 0x61, 0x43], type: 'FLAC 无损音频', extension: '.flac' },
  {
    magic: [0x66, 0x74, 0x79, 0x70],
    offset: 4,
    type: 'MP4/MOV 视频（ftyp 容器）',
    extension: '.mp4',
  },
  { magic: [0x1a, 0x45, 0xdf, 0xa3], type: 'MKV/WebM 视频', extension: '.mkv' },
  { magic: [0x4d, 0x5a], type: 'Windows 可执行文件（EXE/DLL）', extension: '.exe' },
  { magic: [0x7f, 0x45, 0x4c, 0x46], type: 'ELF 可执行文件（Linux）', extension: '' },
  { magic: [0xfe, 0xed, 0xfa], type: 'Mach-O 可执行文件（macOS）', extension: '' },
  { magic: [0xca, 0xfe, 0xba, 0xbe], type: 'Java Class / Mach-O Fat Binary', extension: '.class' },
  { magic: [0x25, 0x21, 0x50, 0x53], type: 'PostScript 文档', extension: '.ps' },
  {
    magic: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
    type: 'OLE 复合文档（doc/xls/ppt）',
    extension: '.doc',
  },
  { magic: [0x3c, 0x3f, 0x78, 0x6d, 0x6c], type: 'XML 文本', extension: '.xml' },
  { magic: [0x3c, 0x21, 0x44, 0x4f, 0x43], type: 'HTML 文本', extension: '.html' },
  { magic: [0xef, 0xbb, 0xbf], type: 'UTF-8 BOM 文本', extension: '.txt' },
]

/** 字节 → 十六进制签名串 */
export function hexOf(bytes: Uint8Array, length = 16): string {
  return Array.from(bytes.slice(0, length))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ')
    .toUpperCase()
}

/** 单条签名匹配（含 offset / extra 校验） */
function matches(bytes: Uint8Array, entry: SignatureEntry): boolean {
  const offset = entry.offset ?? 0
  if (bytes.length < offset + entry.magic.length) return false
  const ok = entry.magic.every((byte, i) => bytes[offset + i] === byte)
  if (!ok) return false
  if (entry.extra) {
    const at: number = entry.extraAt
    if (bytes.length < at + entry.extra.length) return false
    return entry.extra.every((byte, i) => bytes[at + i] === byte)
  }
  return true
}

/** 鉴定文件头字节 */
export function identify(bytes: Uint8Array): MagicResult {
  for (const entry of TABLE) {
    if (matches(bytes, entry)) {
      return { type: entry.type, extension: entry.extension, signature: hexOf(bytes) }
    }
  }
  return { type: null, extension: null, signature: hexOf(bytes) }
}

/** 从文件名取扩展名（小写） */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot).toLowerCase() : ''
}

/** 篡改判断：鉴定出的扩展名与实际扩展名是否矛盾 */
export function tamperVerdict(actual: string, identified: string | null): string {
  if (identified === null) return '文件头未知：无法判断扩展名是否被篡改'
  if (actual === '') return `文件没有扩展名：按文件头看应为 ${identified || '无固定扩展名'}`
  if (identified === '') return '文件头指向可执行文件：扩展名无法直接对照，请谨慎打开'
  if (actual === identified) return '扩展名与文件头一致：未发现篡改迹象'
  return `疑似篡改：扩展名是 ${actual}，但文件头指向 ${identified} 类型`
}

/** 完整流程：只读前 HEADER_BYTES 字节鉴定 */
export async function identifyFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${file.size} 字节，超过 ${MAX_FILE_BYTES} 字节上限`)
  }
  if (file.size === 0) throw new Error('文件为空：无法鉴定')
  const head = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer())
  const result = identify(head)
  const actual = extensionOf(file.name)
  const lines = [
    `文件：${file.name}（${file.size} 字节）`,
    `文件头：${result.signature}`,
    `鉴定结果：${result.type ?? '未知类型（签名表未收录）'}`,
  ]
  if (result.extension) lines.push(`建议扩展名：${result.extension}`)
  lines.push('', tamperVerdict(actual, result.extension))
  return lines.join('\n')
}

/** T2 文本模式：仅提示用文件入口 */
export function transform(input: FileMagicInput, _options: FileMagicOptions): string {
  if (input.text.trim() === '') return ''
  return '本工具通过文件头魔数鉴定类型，请用左下「选择文件」上传待鉴定文件。'
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

/** 把鉴定报告下载为 .txt */
export function downloadReport(report: string, hooks: DownloadHooks = browserHooks): void {
  const url = hooks.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
  try {
    hooks.clickAnchor(url, 'file-magic.txt')
  } finally {
    hooks.revokeObjectURL(url)
  }
}
