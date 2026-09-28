import { unzipSync, zipSync } from 'fflate'
import type { UnzipOptions } from './schema'

/** 单个压缩包上限：200 MiB。再大请用桌面解压软件 */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 解压出的一项：目录的 data 为空字节 */
export interface ZipEntry {
  readonly name: string
  readonly size: number
  readonly isDir: boolean
  readonly data: Uint8Array<ArrayBuffer>
}

/** 以 `/` 结尾的条目名视为目录 */
export function isDirectoryName(name: string): boolean {
  return name.endsWith('/')
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
 * 解析 zip 字节：fflate 抛错（签名不对 / 数据损坏 / 截断）时统一转成中文错误。
 * 空包返回空数组，由调用方报「压缩包为空」。
 */
export function parseZip(bytes: Uint8Array): ZipEntry[] {
  let raw: Record<string, Uint8Array<ArrayBuffer>>
  try {
    raw = unzipSync(bytes)
  } catch {
    throw new Error('不是有效的 ZIP 文件，或文件已损坏（无法解析）')
  }
  return Object.entries(raw).map(([name, data]) => ({
    name,
    size: data.length,
    isDir: isDirectoryName(name),
    data,
  }))
}

/** 非目录条目的解压后总字节数 */
export function totalUnpackedBytes(entries: readonly ZipEntry[]): number {
  return entries.filter((e) => !e.isDir).reduce((sum, e) => sum + e.size, 0)
}

/** 包内清单的文本报告（进 T2 输出区） */
export function formatListing(
  archiveName: string,
  entries: readonly ZipEntry[],
  _options: UnzipOptions,
): string {
  const files = entries.filter((e) => !e.isDir)
  const dirs = entries.filter((e) => e.isDir)
  const lines = [
    `压缩包：${archiveName}`,
    `共 ${files.length} 个文件，${dirs.length} 个目录；解压后 ${formatSize(totalUnpackedBytes(entries))}`,
    '',
  ]
  if (entries.length === 0) {
    lines.push('压缩包为空，没有可解压的内容。')
    return lines.join('\n')
  }
  lines.push('包内清单：')
  entries.forEach((entry, index) => {
    const kind = entry.isDir ? '［目录］' : '［文件］'
    const size = entry.isDir ? '' : `（${formatSize(entry.size)}）`
    lines.push(`${index + 1}. ${kind} ${entry.name}${size}`)
  })
  lines.push('', '在下方列表中点「下载」可逐个保存，或「全部打包下载」一次拿走。')
  return lines.join('\n')
}

/** 按名取条目（下载单个文件用），找不到返回 undefined */
export function entryByName(entries: readonly ZipEntry[], name: string): ZipEntry | undefined {
  return entries.find((entry) => entry.name === name)
}

/** 把解压出的全部文件重新打包成一个 zip（「全部下载」用） */
export function packAll(entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  const record: Record<string, Uint8Array> = {}
  for (const entry of entries) {
    if (!entry.isDir) record[entry.name] = entry.data
  }
  return zipSync(record, { level: 6 })
}

/**
 * 文件入口主流程：读字节 → 校验大小 → 解析 → 组装报告。
 * 返回 { report, entries }：report 进输出区，entries 供下载面板用。
 */
export async function analyzeFile(
  file: File,
  options: UnzipOptions,
): Promise<{ report: string; entries: ZipEntry[] }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `文件过大：${formatSize(file.size)}，超过 ${formatSize(MAX_FILE_BYTES)} 上限（请用桌面解压软件）`,
    )
  }
  const buffer = await file.arrayBuffer()
  const entries = parseZip(new Uint8Array(buffer))
  return { report: formatListing(file.name, entries, options), entries }
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
