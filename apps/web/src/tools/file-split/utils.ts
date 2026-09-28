import type { FileSplitOptions } from './schema'

/** 单个文件上限：200 MiB（切分需要把整个文件读进内存） */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 分片上限：10000 片，再多就是参数写错了 */
export const MAX_PARTS = 10000

/** 切分出的一片 */
export interface FilePart {
  readonly index: number
  readonly name: string
  readonly data: Uint8Array<ArrayBuffer>
}

/** 字节数转人类可读体积 */
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

/**
 * 解析「按大小」的参数：10MB / 512KB / 1.5GB / 1024（默认字节）。
 * 格式不对中文报错。
 */
export function parseSizeInput(text: string): number {
  const clean = text.trim()
  const match = /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i.exec(clean)
  if (!match) {
    throw new Error('分片大小格式不正确，示例：10MB、512KB、1.5GB、1024（字节）')
  }
  const value = Number(match[1])
  const unit = (match[2] ?? 'B').toUpperCase()
  const factor = unit === 'GB' ? 1024 ** 3 : unit === 'MB' ? 1024 ** 2 : unit === 'KB' ? 1024 : 1
  const bytes = Math.floor(value * factor)
  if (bytes <= 0) throw new Error('分片大小必须大于 0')
  return bytes
}

/** 解析「按数量」的参数：正整数 */
export function parseCountInput(text: string): number {
  const clean = text.trim()
  if (!/^\d+$/.test(clean)) throw new Error('分片数量必须是正整数，示例：5')
  const count = Number(clean)
  if (count < 1) throw new Error('分片数量必须是正整数，示例：5')
  if (count > MAX_PARTS) throw new Error(`分片数量不能超过 ${MAX_PARTS}`)
  return count
}

/** 切分方案：总字节 + 模式 + 参数 → 每片精确字节数（按数量模式余数均摊，保证片数精确） */
export function planSplit(
  total: number,
  options: FileSplitOptions,
  value: string,
): { sizes: number[] } {
  if (total <= 0) throw new Error('空文件无需切分')
  if (options.mode === 'size') {
    const partSize = parseSizeInput(value)
    const sizes: number[] = []
    for (let offset = 0; offset < total; offset += partSize) {
      sizes.push(Math.min(partSize, total - offset))
    }
    if (sizes.length > MAX_PARTS) {
      throw new Error(`按该大小会切出 ${sizes.length} 片，超过 ${MAX_PARTS} 上限，请调大分片大小`)
    }
    return { sizes }
  }
  const count = parseCountInput(value)
  if (count > total) {
    throw new Error(`分片数量（${count}）超过文件字节数（${total}），无法切出非空分片`)
  }
  const base = Math.floor(total / count)
  const remainder = total % count
  return { sizes: Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0)) }
}

/** 按字节切分（纯内存 slice，不拷贝也行；这里拷贝保证分片独立） */
export function splitBytes(bytes: Uint8Array, partSize: number): Uint8Array[] {
  const parts: Uint8Array[] = []
  for (let offset = 0; offset < bytes.length; offset += partSize) {
    parts.push(bytes.slice(offset, offset + partSize))
  }
  return parts
}

/** 拆文件名：base + ext（无扩展名时 ext 为空） */
export function splitName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.')
  if (dot > 0) return { base: name.slice(0, dot), ext: name.slice(dot) }
  return { base: name, ext: '' }
}

/** 分片文件名：report.part001.pdf（序号位数按总片数对齐） */
export function partFileName(original: string, index: number, total: number): string {
  const { base, ext } = splitName(original)
  const digits = String(total).length
  const seq = String(index + 1).padStart(digits, '0')
  return `${base}.part${seq}${ext}`
}

/** 完整切分流程：读文件 → 定方案 → 切分 → 命名 */
export async function splitFile(
  file: File,
  options: FileSplitOptions,
  value: string,
): Promise<FilePart[]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限`)
  }
  const plan = planSplit(file.size, options, value)
  const buffer = new Uint8Array(await file.arrayBuffer())
  let offset = 0
  return plan.sizes.map((size, index) => {
    const data = buffer.slice(offset, offset + size)
    offset += size
    return {
      index,
      name: partFileName(file.name, index, plan.sizes.length),
      data,
    }
  })
}

/** 切分方案的文本报告 */
export function formatPlan(
  fileName: string,
  total: number,
  parts: readonly FilePart[],
  options: FileSplitOptions,
): string {
  const modeText = options.mode === 'size' ? '按大小' : '按数量'
  const lines = [
    `切分完成（${modeText}）：${fileName}`,
    `原文件 ${formatSize(total)} → ${parts.length} 个分片`,
    '',
    '分片清单：',
    ...parts.map((part, i) => `${i + 1}. ${part.name}（${formatSize(part.data.length)}）`),
    '',
    '在下方列表中逐个下载；按原顺序拼接即可还原。',
  ]
  return lines.join('\n')
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

/** 触发浏览器下载 */
export function downloadBytes(
  filename: string,
  data: Uint8Array<ArrayBuffer>,
  mime = 'application/octet-stream',
  hooks: DownloadHooks = browserHooks,
): void {
  const url = hooks.createObjectURL(new Blob([data], { type: mime }))
  try {
    hooks.clickAnchor(url, filename)
  } finally {
    hooks.revokeObjectURL(url)
  }
}
