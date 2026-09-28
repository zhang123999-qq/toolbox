/**
 * ass-convert —— ASS / SSA 字幕转换的纯函数层
 *
 * 本文件只放纯函数：ASS 解析（Format 行定位 Start/End/Text 列，兼容 SSA 的
 * `Marked=` 前缀）/ 序列化 / 时间轴偏移 / 格式互转。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 *
 * 样式段（[V4+ Styles] 等）：ASS → ASS 输出时可选保留或丢弃；
 * 转其他格式时样式段自然不参与。
 */

/** 字幕条目：起止时间为毫秒整数 */
export interface SubtitleCue {
  readonly start: number
  readonly end: number
  readonly text: string
}

/** ASS 对话行：保留原始字段以便重建 ASS 输出 */
export interface AssDialogue {
  readonly start: number
  readonly end: number
  readonly text: string
  /** Format 顺序的全部原始字段（Text 字段为原文，可能含逗号） */
  readonly rawFields: readonly string[]
  readonly startIdx: number
  readonly endIdx: number
  readonly textIdx: number
}

/** 解析后的 ASS 文件结构 */
export interface AssFile {
  /** [Events] 之前的全部原始行（样式段等），重建时原样保留 */
  readonly headLines: readonly string[]
  /** [Events] 的 Format 行原文 */
  readonly formatLine: string
  readonly dialogues: readonly AssDialogue[]
}

/** 支持的输出目标 */
export const ASS_TARGETS = ['srt', 'vtt', 'txt', 'json', 'ass'] as const
export type AssTarget = (typeof ASS_TARGETS)[number]

/** 目标格式白名单校验 */
export function validateAssTarget(target: string): asserts target is AssTarget {
  if (!(ASS_TARGETS as readonly string[]).includes(target)) {
    throw new Error(`目标格式非法：${target}（支持：${ASS_TARGETS.join(' / ')}）`)
  }
}

// ---------------------------------------------------------------------------
// ASS 时间戳：H:MM:SS.cc（也兼容 . 分隔与 1–3 位小数）
// ---------------------------------------------------------------------------

const ASS_TIME_RE = /^(\d+):(\d{2}):(\d{2})[.:](\d{1,3})$/

/** ASS 时间戳 → 毫秒；非法抛中文错 */
export function assTimeToMs(raw: string): number {
  const trimmed = raw.trim()
  const m = ASS_TIME_RE.exec(trimmed)
  if (!m) throw new Error(`ASS 时间戳非法：${trimmed === '' ? '（空）' : trimmed}`)
  const minutes = Number(m[2])
  const seconds = Number(m[3])
  if (minutes >= 60 || seconds >= 60) {
    throw new Error(`ASS 时间戳非法：${trimmed}（分钟 / 秒数应在 0～59）`)
  }
  return ((Number(m[1]) * 60 + minutes) * 60 + seconds) * 1000 + Number(m[4].padEnd(3, '0'))
}

/** 毫秒 → ASS 时间戳 `0:00:01.00`（百分秒） */
export function msToAssTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error(`毫秒数非法：${String(ms)}（应为 ≥ 0 的数字）`)
  }
  const total = Math.floor(ms)
  const cs = Math.floor((total % 1000) / 10)
  const seconds = Math.floor(total / 1000) % 60
  const minutes = Math.floor(total / 60000) % 60
  const hours = Math.floor(total / 3600000)
  const p2 = (n: number): string => String(n).padStart(2, '0')
  return `${hours}:${p2(minutes)}:${p2(seconds)}.${p2(cs)}`
}

// ---------------------------------------------------------------------------
// ASS 解析
// ---------------------------------------------------------------------------

/**
 * 解析 ASS / SSA 文本 → 文件结构。
 * 缺少 [Events] 段 / Format 行 / Start-End-Text 列 / Dialogue 字段不足时抛中文错。
 */
export function parseAssFile(text: string): AssFile {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const eventsIdx = lines.findIndex((l) => l.trim().toLowerCase() === '[events]')
  if (eventsIdx < 0) throw new Error('不是合法的 ASS 文件：缺少 [Events] 段')
  const headLines = lines.slice(0, eventsIdx)
  const after = lines.slice(eventsIdx + 1)
  const formatLine = after.find((l) => l.trim().toLowerCase().startsWith('format:'))
  if (formatLine === undefined) throw new Error('不是合法的 ASS 文件：[Events] 缺少 Format 行')
  const fields = formatLine
    .slice(formatLine.indexOf(':') + 1)
    .split(',')
    .map((f) => f.trim().toLowerCase())
  const startIdx = fields.indexOf('start')
  const endIdx = fields.indexOf('end')
  const textIdx = fields.indexOf('text')
  if (startIdx < 0 || endIdx < 0 || textIdx < 0) {
    throw new Error('不是合法的 ASS 文件：Format 行缺少 Start / End / Text 字段')
  }
  const dialogues: AssDialogue[] = []
  for (const line of after) {
    if (!line.trim().toLowerCase().startsWith('dialogue:')) continue
    const rest = line.slice(line.indexOf(':') + 1).trim()
    const parts = rest.split(',')
    if (parts.length <= textIdx) {
      throw new Error(`Dialogue 行字段不足：${line.slice(0, 60)}`)
    }
    const start = assTimeToMs(parts[startIdx])
    const end = assTimeToMs(parts[endIdx])
    if (end < start) throw new Error(`时间轴非法：结束时间早于开始时间（${line.slice(0, 60)}）`)
    const dialogueText = parts.slice(textIdx).join(',')
    dialogues.push({
      start,
      end,
      text: dialogueText,
      rawFields: [...parts.slice(0, textIdx), dialogueText],
      startIdx,
      endIdx,
      textIdx,
    })
  }
  return { headLines, formatLine, dialogues }
}

/** 解析 ASS / SSA 文本 → 字幕条目数组（便捷版） */
export function parseAss(text: string): SubtitleCue[] {
  return parseAssFile(text).dialogues.map((d) => ({ start: d.start, end: d.end, text: d.text }))
}

// ---------------------------------------------------------------------------
// 序列化（SRT / VTT / 纯文本 / JSON / ASS）
// ---------------------------------------------------------------------------

/** 毫秒 → SRT 时间戳 */
export function formatSrtTimestamp(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) throw new Error(`毫秒数非法：${String(ms)}`)
  const total = Math.floor(ms)
  const p2 = (n: number): string => String(n).padStart(2, '0')
  const p3 = (n: number): string => String(n).padStart(3, '0')
  return `${p2(Math.floor(total / 3600000))}:${p2(Math.floor(total / 60000) % 60)}:${p2(Math.floor(total / 1000) % 60)},${p3(total % 1000)}`
}

/** 毫秒 → VTT 时间戳 */
function formatVttTimestamp(ms: number): string {
  return formatSrtTimestamp(ms).replace(',', '.')
}

/** 字幕条目 → SRT 文本 */
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

/** 字幕条目 → VTT 文本 */
export function serializeVtt(cues: readonly SubtitleCue[]): string {
  return (
    `WEBVTT\n\n` +
    cues
      .map((c) => `${formatVttTimestamp(c.start)} --> ${formatVttTimestamp(c.end)}\n${c.text}`)
      .join('\n\n') +
    '\n'
  )
}

/** 字幕条目 → 纯文本 */
export function cuesToText(cues: readonly SubtitleCue[]): string {
  return cues.map((c) => c.text).join('\n')
}

/** 字幕条目 → JSON */
export function cuesToJson(cues: readonly SubtitleCue[]): string {
  return JSON.stringify(
    cues.map((c) => ({ start: c.start, end: c.end, text: c.text })),
    null,
    2,
  )
}

/** 对话行 → 重建的 Dialogue 行（起止时间替换为偏移后的值） */
function rebuildDialogue(d: AssDialogue): string {
  const fields = [...d.rawFields]
  fields[d.startIdx] = msToAssTime(d.start)
  fields[d.endIdx] = msToAssTime(d.end)
  return `Dialogue: ${fields.join(',')}`
}

/** ASS → ASS（保留样式段：原样保留 [Events] 之前的所有行） */
export function rebuildAssFull(file: AssFile, dialogues: readonly AssDialogue[]): string {
  return (
    [...file.headLines, '[Events]', file.formatLine, ...dialogues.map(rebuildDialogue)].join('\n') +
    '\n'
  )
}

/** ASS → ASS（丢弃样式段：只保留最小可用的 [Script Info] + [Events]） */
export function rebuildAssMinimal(dialogues: readonly AssDialogue[]): string {
  const lines = [
    '[Script Info]',
    'Title: 转换的字幕',
    '',
    '[Events]',
    'Format: Layer, Start, End, Text',
  ]
  for (const d of dialogues) {
    lines.push(`Dialogue: 0,${msToAssTime(d.start)},${msToAssTime(d.end)},${d.text}`)
  }
  return lines.join('\n') + '\n'
}

// ---------------------------------------------------------------------------
// 时间轴偏移
// ---------------------------------------------------------------------------

/**
 * 对话行整体偏移毫秒数（可为负）；偏移后时间钳制到 ≥ 0，
 * 偏移后时长 ≤ 0 的行被丢弃；不修改输入。
 */
export function shiftDialogues(dialogues: readonly AssDialogue[], offsetMs: number): AssDialogue[] {
  if (!Number.isFinite(offsetMs)) throw new Error(`偏移量非法：${String(offsetMs)}`)
  const shifted = dialogues.map((d) => ({
    ...d,
    start: Math.max(0, Math.round(d.start + offsetMs)),
    end: Math.max(0, Math.round(d.end + offsetMs)),
  }))
  return shifted.filter((d) => d.end > d.start)
}

// ---------------------------------------------------------------------------
// 一站式转换
// ---------------------------------------------------------------------------

/**
 * ASS / SSA 文本 → 目标格式；先做时间轴整体偏移。
 * keepStyles 只影响 ASS → ASS：保留或丢弃样式段。
 * 空字幕（0 条目）抛中文错。
 */
export function convertAss(
  text: string,
  target: AssTarget,
  offsetMs: number,
  keepStyles: boolean,
): string {
  validateAssTarget(target)
  const file = parseAssFile(text)
  const dialogues = shiftDialogues(file.dialogues, offsetMs)
  if (dialogues.length === 0) throw new Error('字幕为空：没有可转换的字幕条目')
  switch (target) {
    case 'srt':
      return serializeSrt(dialogues)
    case 'vtt':
      return serializeVtt(dialogues)
    case 'txt':
      return cuesToText(dialogues)
    case 'json':
      return cuesToJson(dialogues)
    case 'ass':
      return keepStyles ? rebuildAssFull(file, dialogues) : rebuildAssMinimal(dialogues)
  }
}
