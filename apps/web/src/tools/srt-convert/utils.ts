/**
 * srt-convert —— SRT 字幕转换的纯函数层
 *
 * 本文件只放纯函数：SRT 解析 / 序列化 / 时间轴偏移 / 格式互转。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 *
 * 时间模型：字幕条目起止时间均为毫秒整数；时间戳同时兼容
 * `00:00:00,000`（SRT）与 `00:00:00.000`（VTT）两种写法。
 */

/** 字幕条目：起止时间为毫秒整数 */
export interface SubtitleCue {
  readonly start: number
  readonly end: number
  readonly text: string
}

/** 支持的输出目标 */
export const SRT_TARGETS = ['srt', 'vtt', 'txt', 'json'] as const
export type SrtTarget = (typeof SRT_TARGETS)[number]

/** 目标格式白名单校验 */
export function validateSrtTarget(target: string): asserts target is SrtTarget {
  if (!(SRT_TARGETS as readonly string[]).includes(target)) {
    throw new Error(`目标格式非法：${target}（支持：${SRT_TARGETS.join(' / ')}）`)
  }
}

// ---------------------------------------------------------------------------
// 时间戳
// ---------------------------------------------------------------------------

/** 时间戳正则：HH:MM:SS,mmm / HH:MM:SS.mmm，也兼容 VTT 的 MM:SS.mmm 短式 */
const TIMESTAMP_RE = /^(\d+):(\d{1,2})(?::(\d{1,2}))?[,.](\d{1,3})$/

/** 时间戳 → 毫秒；非法抛中文错 */
export function parseTimestamp(raw: string): number {
  const trimmed = raw.trim()
  const m = TIMESTAMP_RE.exec(trimmed)
  if (!m) throw new Error(`时间戳非法：${trimmed === '' ? '（空）' : trimmed}`)
  const hasHours = m[3] !== undefined
  const hours = hasHours ? Number(m[1]) : 0
  const minutes = hasHours ? Number(m[2]) : Number(m[1])
  const seconds = hasHours ? Number(m[3]) : Number(m[2])
  const millis = Number(m[4].padEnd(3, '0'))
  if (minutes >= 60 || seconds >= 60) {
    throw new Error(`时间戳非法：${trimmed}（分钟 / 秒数应在 0～59）`)
  }
  return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis
}

/** 毫秒 → 时间戳字符串；sep 为毫秒分隔符（SRT 用 `,`，VTT 用 `.`） */
function formatTimestamp(ms: number, sep: string): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error(`毫秒数非法：${String(ms)}（应为 ≥ 0 的数字）`)
  }
  const total = Math.floor(ms)
  const millis = total % 1000
  const seconds = Math.floor(total / 1000) % 60
  const minutes = Math.floor(total / 60000) % 60
  const hours = Math.floor(total / 3600000)
  const p2 = (n: number): string => String(n).padStart(2, '0')
  const p3 = (n: number): string => String(n).padStart(3, '0')
  return `${p2(hours)}:${p2(minutes)}:${p2(seconds)}${sep}${p3(millis)}`
}

/** 毫秒 → SRT 时间戳 `00:00:00,000` */
export function formatSrtTimestamp(ms: number): string {
  return formatTimestamp(ms, ',')
}

/** 毫秒 → VTT 时间戳 `00:00:00.000` */
export function formatVttTimestamp(ms: number): string {
  return formatTimestamp(ms, '.')
}

// ---------------------------------------------------------------------------
// SRT 解析 / 序列化
// ---------------------------------------------------------------------------

/**
 * 解析 SRT 文本 → 字幕条目数组。
 * 容忍：CRLF 换行、可选序号行、序号缺失、块间多余空行；
 * 非法时间戳 / 缺少时间轴 / 结束早于开始时抛中文错。
 */
export function parseSrt(text: string): SubtitleCue[] {
  const blocks = text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((b) => b.trim())
    .filter((b) => b !== '')
  const cues: SubtitleCue[] = []
  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '')
    let idx = 0
    if (lines.length > 1 && /^\d+$/.test(lines[0])) idx = 1
    const timeLine = lines[idx]
    if (!timeLine.includes('-->')) {
      throw new Error(`字幕块缺少时间轴：${block.slice(0, 40)}`)
    }
    const parts = timeLine.split('-->')
    const rawStart = parts[0].trim()
    const rawEnd = parts[1].trim()
    if (rawStart === '' || rawEnd === '') {
      throw new Error(`时间轴格式非法：${timeLine}`)
    }
    const start = parseTimestamp(rawStart)
    const end = parseTimestamp(rawEnd)
    if (end < start) throw new Error(`时间轴非法：结束时间早于开始时间（${timeLine}）`)
    cues.push({ start, end, text: lines.slice(idx + 1).join('\n') })
  }
  return cues
}

/** 字幕条目 → SRT 文本（序号从 1 开始） */
export function serializeSrt(cues: readonly SubtitleCue[]): string {
  return (
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${formatSrtTimestamp(c.start)} --> ${formatSrtTimestamp(c.end)}\n${c.text}`,
      )
      .join('\n\n') + '\n'
  )
}

/** 字幕条目 → VTT 文本（带 WEBVTT 文件头） */
export function serializeVtt(cues: readonly SubtitleCue[]): string {
  return (
    `WEBVTT\n\n` +
    cues
      .map((c) => `${formatVttTimestamp(c.start)} --> ${formatVttTimestamp(c.end)}\n${c.text}`)
      .join('\n\n') +
    '\n'
  )
}

/** 字幕条目 → 纯文本（每条一行） */
export function cuesToText(cues: readonly SubtitleCue[]): string {
  return cues.map((c) => c.text).join('\n')
}

/** 字幕条目 → JSON（start/end 为毫秒，text 为原文） */
export function cuesToJson(cues: readonly SubtitleCue[]): string {
  return JSON.stringify(
    cues.map((c) => ({ start: c.start, end: c.end, text: c.text })),
    null,
    2,
  )
}

// ---------------------------------------------------------------------------
// 时间轴偏移
// ---------------------------------------------------------------------------

/**
 * 整体偏移毫秒数（可为负）；偏移后时间钳制到 ≥ 0，
 * 偏移后时长 ≤ 0 的条目被丢弃；不修改输入。
 */
export function shiftCues(cues: readonly SubtitleCue[], offsetMs: number): SubtitleCue[] {
  if (!Number.isFinite(offsetMs)) throw new Error(`偏移量非法：${String(offsetMs)}`)
  const shifted = cues.map((c) => ({
    start: Math.max(0, Math.round(c.start + offsetMs)),
    end: Math.max(0, Math.round(c.end + offsetMs)),
    text: c.text,
  }))
  return shifted.filter((c) => c.end > c.start)
}

// ---------------------------------------------------------------------------
// 一站式转换
// ---------------------------------------------------------------------------

/**
 * SRT 文本 → 目标格式；先做时间轴整体偏移。
 * 空字幕（0 条目）抛中文错。
 */
export function convertSrt(text: string, target: SrtTarget, offsetMs: number): string {
  const cues = shiftCues(parseSrt(text), offsetMs)
  if (cues.length === 0) throw new Error('字幕为空：没有可转换的字幕条目')
  switch (target) {
    case 'srt':
      return serializeSrt(cues)
    case 'vtt':
      return serializeVtt(cues)
    case 'txt':
      return cuesToText(cues)
    case 'json':
      return cuesToJson(cues)
  }
}
