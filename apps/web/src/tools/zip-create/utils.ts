import { zipSync } from 'fflate'
import type { ZipCreateOptions } from './schema'

/** 打包的文件总大小上限：200 MiB。再大请用桌面压缩软件 */
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024

/** fflate 支持的压缩级别：0 = 仅存储，9 = 最大压缩 */
export const COMPRESSION_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const

/** 待打包的一项：文件名 + 原始字节 */
export interface ZipEntryInput {
  readonly name: string
  readonly data: Uint8Array
}

/** 字节数转人类可读体积：1024 → "1.00 KiB" */
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

/** 全部条目的字节总数 */
export function totalBytes(entries: readonly ZipEntryInput[]): number {
  return entries.reduce((sum, entry) => sum + entry.data.length, 0)
}

/** 打包前校验：空选择与超限都在这里拦下 */
export function checkEntries(entries: readonly ZipEntryInput[]): void {
  if (entries.length === 0) throw new Error('请先选择至少一个文件再打包')
  const total = totalBytes(entries)
  if (total > MAX_TOTAL_BYTES) {
    throw new Error(
      `文件总大小 ${formatSize(total)}，超过 ${formatSize(MAX_TOTAL_BYTES)} 上限（请分批打包）`,
    )
  }
}

/** 压缩级别必须是 0–9 的整数 */
export function checkLevel(level: number): asserts level is 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  if (!Number.isInteger(level) || level < 0 || level > 9) {
    throw new Error('压缩级别必须是 0–9 的整数')
  }
}

/**
 * 文件名清洗：zip 条目只保留基名，去掉用户系统上的目录部分；
 * 空名兜底为 unnamed，避免 zipSync 抛错。
 */
export function sanitizeName(name: string): string {
  const base = name.split(/[\\/]/).pop() as string
  const clean = base.trim()
  return clean === '' ? 'unnamed' : clean
}

/**
 * 重名消解：同名文件依次追加 " (2)" / " (3)"（后缀留在扩展名之前），
 * 保证 zip 内条目名唯一。
 */
export function dedupeNames(names: readonly string[]): string[] {
  const used = new Set<string>()
  return names.map((raw) => {
    let name = raw
    let n = 2
    while (used.has(name)) {
      const dot = raw.lastIndexOf('.')
      name = dot > 0 ? `${raw.slice(0, dot)} (${n})${raw.slice(dot)}` : `${raw} (${n})`
      n += 1
    }
    used.add(name)
    return name
  })
}

/**
 * 打包：校验 → 清洗文件名 → 消解重名 → fflate zipSync。
 * 返回 zip 文件的完整字节。
 */
export function createZip(
  entries: readonly ZipEntryInput[],
  options: ZipCreateOptions,
): Uint8Array<ArrayBuffer> {
  checkEntries(entries)
  checkLevel(options.level)
  const names = dedupeNames(entries.map((entry) => sanitizeName(entry.name)))
  const record: Record<string, Uint8Array> = {}
  entries.forEach((entry, index) => {
    record[names[index] as string] = entry.data
  })
  return zipSync(record, { level: options.level })
}

/** 压缩包文件名：去掉首尾空白与可能的手写扩展名，空则回退 archive */
export function resolveArchiveName(text: string): string {
  const clean = text.trim().replace(/\.zip$/i, '')
  return clean === '' ? 'archive' : clean
}

/** 打包结果的文本报告（进输出区 / 复制用） */
export function formatReport(
  archiveName: string,
  names: readonly string[],
  total: number,
  zipSize: number,
  level: number,
): string {
  const lines = [
    `打包成功：${archiveName}.zip`,
    `文件数：${names.length}，原始 ${formatSize(total)} → 压缩包 ${formatSize(zipSize)}，级别 ${level}`,
    '',
    '包内文件：',
    ...names.map((name, index) => `${index + 1}. ${name}`),
  ]
  return lines.join('\n')
}

/** 把用户选中的 File 读成条目（保留原始文件名） */
export async function readUploads(files: readonly File[]): Promise<ZipEntryInput[]> {
  const out: ZipEntryInput[] = []
  for (const file of files) {
    const buffer = await file.arrayBuffer()
    out.push({ name: file.name, data: new Uint8Array(buffer) })
  }
  return out
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

/** 触发浏览器下载：Blob → 对象 URL → 模拟点击 → 回收 URL */
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
