/**
 * text-to-audio —— 文字转语音的纯函数层（参数校验 + 长文本分段）
 *
 * 约定：
 * - 浏览器 SpeechSynthesis 对单次文本长度有限制，长文本按句子边界切段后逐段朗读；
 * - 本文件不触碰任何浏览器 API（speechSynthesis 只在 Tool.tsx），
 *   可在 node 下被 vitest 完整测试。
 */

/** 语速合法区间（1 为正常） */
export const MIN_RATE = 0.1
export const MAX_RATE = 10
/** 音调合法区间（1 为正常） */
export const MIN_PITCH = 0
export const MAX_PITCH = 2
/** 单段最大长度（字符） */
export const MAX_CHUNK_LEN = 200
/** 分段长度参数的合法上限 */
export const MAX_CHUNK_PARAM = 5000
/** 句子边界：中英文句末标点与换行（保留在段尾） */
const SENTENCE_BOUNDARY = /([。！？；…\n.!?;]+)/

export interface SpeakOptions {
  readonly text: string
  readonly rate: number
  readonly pitch: number
}

/** 朗读参数校验，非法抛中文错 */
export function validateSpeakOptions(text: string, rate: number, pitch: number): SpeakOptions {
  if (text.trim() === '') throw new Error('请输入要朗读的文字')
  if (!Number.isFinite(rate) || rate < MIN_RATE || rate > MAX_RATE) {
    throw new Error(`语速非法：${String(rate)}（应为 ${MIN_RATE}～${MAX_RATE}）`)
  }
  if (!Number.isFinite(pitch) || pitch < MIN_PITCH || pitch > MAX_PITCH) {
    throw new Error(`音调非法：${String(pitch)}（应为 ${MIN_PITCH}～${MAX_PITCH}）`)
  }
  return { text, rate, pitch }
}

/** 语速钳制到合法区间（供滑杆用）；非有限数回退 1 */
export function clampRate(v: number): number {
  if (!Number.isFinite(v)) return 1
  return Math.min(MAX_RATE, Math.max(MIN_RATE, v))
}

/** 音调钳制到合法区间（供滑杆用）；非有限数回退 1 */
export function clampPitch(v: number): number {
  if (!Number.isFinite(v)) return 1
  return Math.min(MAX_PITCH, Math.max(MIN_PITCH, v))
}

/**
 * 长文本分段（纯函数）：按句子边界贪心拼接，单句超长则硬切。
 * 返回非空段数组；空文本抛中文错。
 */
export function chunkText(text: string, maxLen = MAX_CHUNK_LEN): string[] {
  if (!Number.isInteger(maxLen) || maxLen < 1 || maxLen > MAX_CHUNK_PARAM) {
    throw new Error(`分段长度非法：${String(maxLen)}（应为 1～${MAX_CHUNK_PARAM} 的整数）`)
  }
  const src = text.trim()
  if (src === '') throw new Error('请输入要朗读的文字')
  const chunks: string[] = []
  let cur = ''
  const flush = (): void => {
    if (cur !== '') {
      chunks.push(cur)
      cur = ''
    }
  }
  const pushPiece = (piece: string): void => {
    if (cur.length + piece.length <= maxLen) {
      cur += piece
      return
    }
    flush()
    // 单句仍超长 → 按 maxLen 硬切
    let rest = piece
    while (rest.length > maxLen) {
      chunks.push(rest.slice(0, maxLen))
      rest = rest.slice(maxLen)
    }
    cur = rest
  }
  const sentences = src.split(SENTENCE_BOUNDARY).filter((s) => s !== '')
  for (const s of sentences) pushPiece(s)
  flush()
  return chunks
}

/** 朗读任务的中文摘要 */
export function formatSpeakSummary(chunks: number, rate: number, pitch: number): string {
  if (!Number.isInteger(chunks) || chunks < 1) {
    throw new Error(`分段数非法：${String(chunks)}`)
  }
  return `共 ${chunks} 段，语速 ${rate}×，音调 ${pitch}`
}
