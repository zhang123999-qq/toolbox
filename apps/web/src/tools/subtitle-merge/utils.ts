/**
 * subtitle-merge —— 字幕合并的纯函数层
 *
 * 本文件只放纯函数：SRT / VTT / ASS 三种格式的解析（自动识别）、
 * 多文件按时间轴合并排序、去重、去重叠、整体偏移、序列化输出。
 * 不触碰任何浏览器 API，可在 node 下被 vitest 完整测试。
 */

/** 字幕条目：起止时间为毫秒整数 */
export interface SubtitleCue {
  readonly start: number
  readonly end: number
  readonly text: string
}

/** 待合并的字幕文件 */
export interface MergeFile {
  readonly name: string
  readonly text: string
}

/** 合并输出格式 */
export const MERGE_FORMATS = ['srt', 'vtt'] as const
export type MergeFormat = (typeof MERGE_FORMATS)[number]

/** 合并统计 */
export interface MergeStats {
  readonly fileCount: number
  readonly totalParsed: number
  readonly merged: number
  readonly droppedDuplicates: number
  readonly trimmedOverlaps: number
  readonly droppedEmpty: number
}

/** 合并结果 */
export interface MergeResult {
  readonly output: string
  readonly stats: MergeStats
}

/** 输出格式白名单校验 */
export function validateMergeFormat(format: string): asserts format is MergeFormat {
  if (!(MERGE_FORMATS as readonly string[]).includes(format)) {
    throw new Error(`输出格式非法：${format}（支持：${MERGE_FORMATS.join(' / ')}）`)
  }
}

// ---------------------------------------------------------------------------
// 时间戳
// ---------------------------------------------------------------------------

/** 时间戳正则：HH:MM:SS,mmm / HH:MM:SS.mmm，兼容 VTT 的 MM:SS.mmm 短式 */
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

/** ASS 时间戳 H:MM:SS.cc → 毫秒 */
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

/** 毫秒 → 时间戳字符串；sep 为毫秒分隔符（SRT 用 `,`，VTT 用 `.`） */
export function formatTimestamp(ms: number, sep: string): string {
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

// ---------------------------------------------------------------------------
// 三种格式解析（自动识别入口在 detectFormat / parseAny）
// ---------------------------------------------------------------------------

/** 按首个非空行识别格式：WEBVTT / [Script Info] / 其他按 SRT 处理 */
export function detectFormat(text: string): 'srt' | 'vtt' | 'ass' {
  const head = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .find((l) => l.trim() !== '')
  const first = head === undefined ? '' : head.trim()
  if (first.toUpperCase().startsWith('WEBVTT')) return 'vtt'
  const lower = first.toLowerCase()
  if (lower === '[script info]' || lower === '[events]') return 'ass'
  // ASS 样例可能直接以 [Events] 开头，或缺少 [Script Info] 头：文本含 [Events] 段
  // 且有 ASS 风格的 Format: / Dialogue: 行时也判为 ASS
  if (/^\[events\]/im.test(text) && /^(format|dialogue):/im.test(text)) return 'ass'
  return 'srt'
}

/** SRT 解析 */
function parseSrtCues(text: string): SubtitleCue[] {
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
    const start = parseTimestamp(parts[0].trim())
    const end = parseTimestamp(parts[1].trim())
    if (end < start) throw new Error(`时间轴非法：结束时间早于开始时间（${timeLine}）`)
    cues.push({ start, end, text: lines.slice(idx + 1).join('\n') })
  }
  return cues
}

/** VTT 解析（跳过 NOTE / STYLE / REGION 块与 cue settings） */
function parseVttCues(text: string): SubtitleCue[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  const blocks = normalized
    .split(/\n[ \t]*\n/)
    .map((b) => b.trim())
    .filter((b) => b !== '')
  const cues: SubtitleCue[] = []
  for (const block of blocks) {
    if (/^(WEBVTT|NOTE|STYLE|REGION)(\s|$)/.test(block)) continue
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '')
    const timeIdx = lines.findIndex((l) => l.includes('-->'))
    if (timeIdx < 0) throw new Error(`字幕块缺少时间轴：${block.slice(0, 40)}`)
    const timeLine = lines[timeIdx]
    const parts = timeLine.split('-->')
    const start = parseTimestamp(parts[0].trim())
    const end = parseTimestamp(parts[1].trim().split(/\s+/)[0].trim())
    if (end < start) throw new Error(`时间轴非法：结束时间早于开始时间（${timeLine}）`)
    cues.push({ start, end, text: lines.slice(timeIdx + 1).join('\n') })
  }
  return cues
}

/** ASS / SSA 解析（只取 Dialogue 行的时间与文本） */
function parseAssCues(text: string): SubtitleCue[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const eventsIdx = lines.findIndex((l) => l.trim().toLowerCase() === '[events]')
  if (eventsIdx < 0) throw new Error('不是合法的 ASS 文件：缺少 [Events] 段')
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
  const cues: SubtitleCue[] = []
  for (const line of after) {
    if (!line.trim().toLowerCase().startsWith('dialogue:')) continue
    const parts = line
      .slice(line.indexOf(':') + 1)
      .trim()
      .split(',')
    if (parts.length <= textIdx) throw new Error(`Dialogue 行字段不足：${line.slice(0, 40)}`)
    const start = assTimeToMs(parts[startIdx])
    const end = assTimeToMs(parts[endIdx])
    if (end < start) throw new Error(`时间轴非法：结束时间早于开始时间（${line.slice(0, 40)}）`)
    cues.push({ start, end, text: parts.slice(textIdx).join(',') })
  }
  return cues
}

/** 自动识别格式并解析 */
export function parseAny(text: string): SubtitleCue[] {
  const format = detectFormat(text)
  switch (format) {
    case 'vtt':
      return parseVttCues(text)
    case 'ass':
      return parseAssCues(text)
    case 'srt':
      return parseSrtCues(text)
  }
}

// ---------------------------------------------------------------------------
// 合并
// ---------------------------------------------------------------------------

/** 字幕条目 → SRT 文本 */
export function serializeSrt(cues: readonly SubtitleCue[]): string {
  return (
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${formatTimestamp(c.start, ',')} --> ${formatTimestamp(c.end, ',')}\n${c.text}`,
      )
      .join('\n\n') + '\n'
  )
}

/** 字幕条目 → VTT 文本 */
export function serializeVtt(cues: readonly SubtitleCue[]): string {
  return (
    `WEBVTT\n\n` +
    cues
      .map((c) => `${formatTimestamp(c.start, '.')} --> ${formatTimestamp(c.end, '.')}\n${c.text}`)
      .join('\n\n') +
    '\n'
  )
}

/**
 * 合并多个字幕文件：
 * 1. 逐个解析（自动识别 SRT / VTT / ASS），失败标注文件名抛中文错；
 * 2. 整体偏移（可为负，钳制到 ≥ 0，偏移后空条目丢弃）；
 * 3. 按开始时间排序；
 * 4. 起止时间与文本完全相同的条目去重；
 * 5. 重叠条目：后一条的开始时间截到前一条的结束时间，截空则丢弃。
 */
export function mergeSubtitles(
  files: readonly MergeFile[],
  offsetMs: number,
  format: MergeFormat,
): MergeResult {
  if (files.length === 0) throw new Error('请至少提供一个字幕文件')
  if (!Number.isFinite(offsetMs)) throw new Error(`偏移量非法：${String(offsetMs)}`)
  validateMergeFormat(format)
  let totalParsed = 0
  const shifted: SubtitleCue[] = []
  for (const file of files) {
    let cues: SubtitleCue[]
    try {
      cues = parseAny(file.text)
    } catch (err) {
      throw new Error(`文件「${file.name}」解析失败：${(err as Error).message}`, { cause: err })
    }
    totalParsed += cues.length
    for (const c of cues) {
      shifted.push({
        start: Math.max(0, Math.round(c.start + offsetMs)),
        end: Math.max(0, Math.round(c.end + offsetMs)),
        text: c.text,
      })
    }
  }
  // 偏移后时长 ≤ 0 的条目丢弃
  const valid = shifted.filter((c) => c.end > c.start)
  let droppedEmpty = shifted.length - valid.length
  // 按时间轴排序
  valid.sort((a, b) => a.start - b.start || a.end - b.end)
  const merged: SubtitleCue[] = []
  const seen = new Set<string>()
  let droppedDuplicates = 0
  let trimmedOverlaps = 0
  for (const cue of valid) {
    const key = `${cue.start}|${cue.end}|${cue.text}`
    if (seen.has(key)) {
      droppedDuplicates++
      continue
    }
    seen.add(key)
    const prev = merged[merged.length - 1]
    if (prev !== undefined && cue.start < prev.end) {
      trimmedOverlaps++
      const trimmed: SubtitleCue = { start: prev.end, end: cue.end, text: cue.text }
      if (trimmed.end > trimmed.start) merged.push(trimmed)
      else droppedEmpty++
      continue
    }
    merged.push(cue)
  }
  if (merged.length === 0) throw new Error('字幕为空：合并后没有可用条目')
  const output = format === 'srt' ? serializeSrt(merged) : serializeVtt(merged)
  return {
    output,
    stats: {
      fileCount: files.length,
      totalParsed,
      merged: merged.length,
      droppedDuplicates,
      trimmedOverlaps,
      droppedEmpty,
    },
  }
}
