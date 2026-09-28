import { analyse, detect } from 'chardet'
import type { FileEncodingOptions } from './schema'

/** 单个文件上限：200 MiB（检测只读前 1 MiB 样本，超限仍直接报错） */
export const MAX_FILE_BYTES = 200 * 1024 * 1024

/** 检测用的样本大小：1 MiB，足够 chardet 判断，又不会拖慢 */
export const SAMPLE_BYTES = 1024 * 1024

/** 解码预览的最大字符数 */
export const PREVIEW_CHARS = 5000

/** 候选编码 */
export interface EncodingCandidate {
  readonly name: string
  readonly confidence: number
}

/** 纯 7 位字节直接判 ASCII：短 ASCII 样本 chardet 会给出奇怪的高分候选 */
export function isAscii(bytes: Uint8Array): boolean {
  for (const byte of bytes) {
    if (byte >= 0x80) return false
  }
  return true
}

/** UTF-8 BOM 头：EF BB BF */
export function hasUtf8Bom(bytes: Uint8Array): boolean {
  return bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf
}

/** 取检测样本（前 1 MiB）；空文件返回空数组由调用方处理 */
export function sampleBytes(bytes: Uint8Array): Uint8Array {
  return bytes.length > SAMPLE_BYTES ? bytes.subarray(0, SAMPLE_BYTES) : bytes
}

/** 前 N 个候选（按置信度降序，chardet 已排好） */
export function topCandidates(bytes: Uint8Array, topN: number): EncodingCandidate[] {
  return analyse(bytes)
    .slice(0, topN)
    .map((item) => ({ name: item.name, confidence: item.confidence }))
}

/** 最佳猜测：ASCII / BOM 走快速路径，否则问 chardet */
export function detectEncoding(bytes: Uint8Array): string {
  if (isAscii(bytes)) return 'ASCII'
  if (hasUtf8Bom(bytes)) return 'UTF-8'
  return detect(bytes) ?? '未知'
}

/** 按给定编码解码；当前环境不支持的编码（如 UTF-32）返回 null */
export function tryDecode(bytes: Uint8Array, encoding: string): string | null {
  if (encoding === 'ASCII') return new TextDecoder('utf-8').decode(bytes)
  try {
    return new TextDecoder(encoding.toLowerCase()).decode(bytes)
  } catch {
    return null
  }
}

/** 预览截断：超长时截断并标注 */
export function truncatePreview(text: string): { preview: string; truncated: boolean } {
  if (text.length <= PREVIEW_CHARS) return { preview: text, truncated: false }
  return { preview: text.slice(0, PREVIEW_CHARS), truncated: true }
}

/** 拼最终报告 */
export function formatReport(
  fileName: string,
  size: number,
  best: string,
  confidence: number,
  candidates: readonly EncodingCandidate[],
  decoded: string | null,
  truncated: boolean,
  preview: boolean,
): string {
  const lines = [
    `文件：${fileName}（${size} 字节）`,
    `检测结果：${best}` + (confidence > 0 ? `（置信度 ${confidence}）` : ''),
    '候选：',
    ...candidates.map((item, index) => `  ${index + 1}. ${item.name}  ${item.confidence}`),
  ]
  if (preview) {
    lines.push('')
    if (decoded === null) {
      lines.push(`按 ${best} 解码：该编码当前环境不支持（TextDecoder 未实现），无法预览。`)
    } else {
      lines.push(`按 ${best} 解码预览${truncated ? `（仅前 ${PREVIEW_CHARS} 字符）` : ''}：`)
      lines.push(decoded)
    }
  }
  return lines.join('\n')
}

/** 文件入口主流程：读字节 → 取样本 → 检测 → 解码预览 → 报告 */
export async function analyzeFile(file: File, options: FileEncodingOptions): Promise<string> {
  if (file.size === 0) throw new Error('空文件无法检测编码')
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`文件过大：${file.size} 字节，超过 ${MAX_FILE_BYTES} 字节上限`)
  }
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  const sample = sampleBytes(bytes)
  const best = detectEncoding(sample)
  const candidates = topCandidates(sample, options.topN)
  const bestConfidence = candidates.find((item) => item.name === best)?.confidence ?? 0
  let decoded: string | null = null
  let truncated = false
  if (options.preview) {
    decoded = tryDecode(bytes, best)
    if (decoded !== null) {
      const cut = truncatePreview(decoded)
      decoded = cut.preview
      truncated = cut.truncated
    }
  }
  return formatReport(
    file.name,
    file.size,
    best,
    bestConfidence,
    candidates,
    decoded,
    truncated,
    options.preview,
  )
}
