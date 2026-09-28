import { diffChars, diffLines, diffWords } from 'diff'
import type { FileCompareOptions } from './schema'

/** 单个文件上限：200 MiB（按字节读入后解码对比） */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 解码后的文本上限：1000 万字符，再大浏览器渲染差异会卡死 */
export const MAX_TEXT_CHARS = 10_000_000

/** diff 粒度 */
export const MODES = ['line', 'char', 'word'] as const

/** 差异行：same = 相同，add = 文件 B 新增，del = 文件 A 删除 */
export interface DiffRow {
  readonly type: 'same' | 'add' | 'del'
  readonly text: string
}

/** 对比统计 */
export interface DiffStats {
  readonly added: number
  readonly removed: number
  readonly unchanged: number
  readonly identical: boolean
}

/** 忽略行首尾空白：diff 前先做归一化 */
export function normalize(text: string, ignoreWhitespace: boolean): string {
  if (!ignoreWhitespace) return text
  return text
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
}

/** 二进制嗅探：含 NUL 字节就按二进制处理（不做文本 diff） */
export function isBinary(bytes: Uint8Array): boolean {
  for (const byte of bytes) {
    if (byte === 0) return true
  }
  return false
}

/**
 * 两段文本做 diff。行模式按行切成 DiffRow；
 * 词 / 字符模式按 diff 片段切成 DiffRow（片段内可含换行，渲染时保留）。
 */
export function diffTexts(a: string, b: string, options: FileCompareOptions): DiffRow[] {
  const left = normalize(a, options.ignoreWhitespace)
  const right = normalize(b, options.ignoreWhitespace)
  const parts =
    options.mode === 'line'
      ? diffLines(left, right)
      : options.mode === 'word'
        ? diffWords(left, right)
        : diffChars(left, right)
  const rows: DiffRow[] = []
  for (const part of parts) {
    const type = part.added ? 'add' : part.removed ? 'del' : 'same'
    if (options.mode === 'line') {
      // diffLines 的片段以换行结尾：拆行，末尾空串丢弃
      const lines = part.value.split('\n')
      if (lines[lines.length - 1] === '') lines.pop()
      for (const line of lines) rows.push({ type, text: line })
    } else {
      rows.push({ type, text: part.value })
    }
  }
  return rows
}

/** 统计：行模式按行数，词 / 字符模式按字符数 */
export function summarize(rows: readonly DiffRow[], mode: string): DiffStats {
  let added = 0
  let removed = 0
  let unchanged = 0
  for (const row of rows) {
    const n = mode === 'line' ? 1 : row.text.length
    if (row.type === 'add') added += n
    else if (row.type === 'del') removed += n
    else unchanged += n
  }
  return { added, removed, unchanged, identical: added === 0 && removed === 0 }
}

/** 统一格式的纯文本报告（复制 / 下载用）：+ 新增，- 删除，空格 相同 */
export function formatUnified(
  rows: readonly DiffRow[],
  aName: string,
  bName: string,
  stats: DiffStats,
): string {
  const head = stats.identical
    ? `两文件内容完全相同：${aName} ≡ ${bName}`
    : `差异：${aName} → ${bName}（+${stats.added} / -${stats.removed}，相同 ${stats.unchanged}）`
  const lines = [head, `--- ${aName}`, `+++ ${bName}`]
  for (const row of rows) {
    const mark = row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '
    lines.push(mark + row.text)
  }
  return lines.join('\n')
}

/** 报告首行的人类可读摘要 */
export function formatSummary(aName: string, bName: string, stats: DiffStats): string {
  if (stats.identical) return `两文件内容完全相同：${aName} ≡ ${bName}`
  return `${aName} → ${bName}：新增 ${stats.added}，删除 ${stats.removed}，相同 ${stats.unchanged}`
}

/** 文件读成文本：大小校验 → 二进制拦截 → UTF-8 解码 → 长度校验 */
export async function readTextFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件 ${file.name} 过大（${file.size} 字节），超过 200 MiB 上限`)
  }
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  if (isBinary(bytes)) {
    throw new Error(`文件 ${file.name} 可能是二进制文件，本工具只对比文本文件`)
  }
  const text = new TextDecoder('utf-8').decode(bytes)
  if (text.length > MAX_TEXT_CHARS) {
    throw new Error(`文件 ${file.name} 解码后超过 1000 万字符，差异渲染会卡死，请拆小再比`)
  }
  return text
}

/** 两个文件的完整对比流程：读文件 → diff → 统计 */
export async function compareFiles(
  a: File,
  b: File,
  options: FileCompareOptions,
): Promise<{ rows: DiffRow[]; stats: DiffStats }> {
  const [textA, textB] = await Promise.all([readTextFile(a), readTextFile(b)])
  const rows = diffTexts(textA, textB, options)
  return { rows, stats: summarize(rows, options.mode) }
}
