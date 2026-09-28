import { zipSync } from 'fflate'
import type { BatchRenameOptions } from './schema'

/** 文件总量上限：200 MiB */
export const MAX_TOTAL_BYTES = 200 * 1024 * 1024

/** 批量文件数上限 */
export const MAX_FILES = 2000

/** 一条重命名记录 */
export interface RenameRecord {
  readonly original: string
  readonly renamed: string
  readonly data: Uint8Array
}

/** 从文件名拆 base / ext */
export function splitName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return { base: name, ext: '' }
  return { base: name.slice(0, dot), ext: name.slice(dot) }
}

/** Windows 非法字符与控制字符 → 下划线 */
export function sanitize(name: string): string {
  const out: string[] = []
  for (const ch of name) {
    const code = Number(ch.codePointAt(0))
    out.push(code < 0x20 || '<>:"/\\|?*'.includes(ch) ? '_' : ch)
  }
  return out.join('').trim()
}

/** 序号补零：start=7、digits=3 → 007 */
export function padNumber(n: number, digits: number): string {
  return String(n).padStart(digits, '0')
}

/** 冲突消解：名字已被占用时追加 ` (2)` / ` (3)` */
export function resolveConflict(name: string, used: Set<string>): string {
  if (!used.has(name)) return name
  const { base, ext } = splitName(name)
  let n = 2
  let candidate = `${base} (${n})${ext}`
  while (used.has(candidate)) {
    n += 1
    candidate = `${base} (${n})${ext}`
  }
  return candidate
}

/** 单条规则应用（未做冲突消解） */
export function applyRule(original: string, index: number, options: BatchRenameOptions): string {
  const { base, ext } = splitName(original)
  switch (options.rule) {
    case 'prefix': {
      const prefix = options.prefix.trim() === '' ? 'renamed' : options.prefix
      return sanitize(prefix + base) + ext
    }
    case 'number': {
      const prefix = options.prefix.trim() === '' ? '' : sanitize(options.prefix)
      return prefix + padNumber(options.start + index, options.digits) + ext
    }
    case 'replace': {
      if (options.find === '') return original
      return sanitize(base.split(options.find).join(options.replace)) + ext
    }
  }
}

/** 批量重命名：参数校验 → 逐条应用规则 → 冲突自动加序号 */
export function renameFiles(names: string[], options: BatchRenameOptions): string[] {
  if (names.length === 0) throw new Error('请先选择要重命名的文件')
  if (names.length > MAX_FILES) throw new Error(`文件数过多：最多 ${MAX_FILES} 个`)
  if (options.rule === 'prefix' && options.prefix.trim() === '') {
    throw new Error('「加前缀」规则需要填写前缀')
  }
  if (options.rule === 'replace' && options.find === '') {
    throw new Error('「查找替换」规则需要填写查找内容')
  }
  const used = new Set<string>()
  return names.map((original, index) => {
    const renamed = resolveConflict(applyRule(original, index, options), used)
    used.add(renamed)
    return renamed
  })
}

/** 对照表文本 */
export function formatMapping(originals: string[], renamed: string[]): string {
  const lines = ['批量重命名对照表', '']
  originals.forEach((original, index) => {
    lines.push(`${index + 1}. ${original} → ${renamed[index]}`)
  })
  return lines.join('\n')
}

/** 读文件字节（总量超限中文报错） */
export async function readFiles(files: readonly File[]): Promise<Uint8Array[]> {
  const total = files.reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_TOTAL_BYTES) {
    throw new Error(`文件总量过大：${total} 字节，超过 ${MAX_TOTAL_BYTES} 字节上限`)
  }
  return Promise.all(files.map(async (file) => new Uint8Array(await file.arrayBuffer())))
}

/** 打包为 renamed.zip：重命名后的文件 + mapping.txt */
export function packRenamed(records: RenameRecord[]): Uint8Array<ArrayBuffer> {
  const mapping = formatMapping(
    records.map((r) => r.original),
    records.map((r) => r.renamed),
  )
  const entries: Record<string, Uint8Array> = {
    'mapping.txt': new TextEncoder().encode(mapping),
  }
  for (const record of records) {
    entries[record.renamed] = record.data
  }
  return zipSync(entries, { level: 0 })
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
