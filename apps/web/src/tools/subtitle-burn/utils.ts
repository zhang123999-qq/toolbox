/**
 * subtitle-burn —— 字幕烧录的纯函数层
 *
 * 约定：
 * - 字幕条目用 SubtitleCue 表示（时间单位：秒，可为小数）
 * - SRT / VTT 解析、字幕样式校验、ffmpeg 烧录参数拼装都在这里；
 *   真正调用 ffmpeg.wasm 的部分在 Tool.tsx（动态 import），本文件不触碰浏览器 API，
 *   可在 node 下被 vitest 完整测试。
 */

/** 一条字幕：序号 / 起止时间（秒）/ 文本（多行以 \n 连接） */
export interface SubtitleCue {
  readonly index: number
  readonly start: number
  readonly end: number
  readonly text: string
}

/** 烧录样式选项 */
export interface BurnStyle {
  readonly fontSize: number
  readonly fontColor: string
  /** 字幕在画面中的垂直位置 */
  readonly position: 'top' | 'middle' | 'bottom'
}

/** 支持的字幕位置 */
export const BURN_POSITIONS = ['top', 'middle', 'bottom'] as const

/** ASS 对齐码：bottom=2 / middle=5 / top=8 */
const ASS_ALIGNMENT: Record<BurnStyle['position'], number> = {
  bottom: 2,
  middle: 5,
  top: 8,
}

// ---------------------------------------------------------------------------
// 时间解析与格式化
// ---------------------------------------------------------------------------

/** "00:00:01,000" / "00:00:01.000" → 秒；非法抛中文错 */
export function parseSrtTime(raw: string): number {
  const m = /^(\d+):([0-5]\d):([0-5]\d)[,.](\d{1,3})$/.exec(raw.trim())
  if (!m) throw new Error(`SRT 时间格式非法："${raw}"（应为 HH:MM:SS,mmm）`)
  const hours = Number(m[1])
  const minutes = Number(m[2])
  const seconds = Number(m[3])
  const millis = Number(m[4]!.padEnd(3, '0'))
  return hours * 3600 + minutes * 60 + seconds + millis / 1000
}

/** "00:00:01.000"（VTT 用点分隔毫秒）→ 秒；非法抛中文错 */
export function parseVttTime(raw: string): number {
  const m = /^(\d{2,}):([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(raw.trim())
  if (!m) throw new Error(`VTT 时间格式非法："${raw}"（应为 HH:MM:SS.mmm）`)
  const hours = Number(m[1])
  const minutes = Number(m[2])
  const seconds = Number(m[3])
  const millis = Number(m[4])
  return hours * 3600 + minutes * 60 + seconds + millis / 1000
}

/** 秒 → "00:00:01,000"（SRT 格式）；非法抛中文错 */
export function formatSrtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) throw new Error(`时间非法：${String(sec)}（应为非负数）`)
  const totalMs = Math.round(sec * 1000)
  const hours = Math.floor(totalMs / 3600000)
  const minutes = Math.floor((totalMs % 3600000) / 60000)
  const seconds = Math.floor((totalMs % 60000) / 1000)
  const millis = totalMs % 1000
  const pad = (n: number, len: number): string => String(n).padStart(len, '0')
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(millis, 3)}`
}

// ---------------------------------------------------------------------------
// 字幕解析
// ---------------------------------------------------------------------------

/** 校验一条字幕的时间合法性：start < end（解析函数已保证时间为有限非负数） */
function assertCueTime(start: number, end: number, index: number): void {
  if (start >= end) throw new Error(`第 ${index} 条字幕的开始时间必须早于结束时间`)
}

/** 按空行切分字幕块 */
function splitBlocks(text: string): string[] {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
}

/**
 * 解析 SRT 字幕文本 → 字幕条目数组。
 * 空文本抛中文错；时间行缺失 / 时间非法抛中文错。
 */
export function parseSrt(text: string): SubtitleCue[] {
  const blocks = splitBlocks(text)
  if (blocks.length === 0) throw new Error('字幕内容为空：没有可解析的字幕条目')
  return blocks.map((block, i) => {
    const index = i + 1
    const lines = block.split('\n')
    // SRT 块：序号行（可选）+ 时间行 + 文本行
    const timeLine = lines.length > 1 && lines[0]!.includes('-->') ? lines[0]! : (lines[1] ?? '')
    const m = /^(.*?)\s*-->\s*(.*?)$/.exec(timeLine)
    if (!m) throw new Error(`第 ${index} 条字幕缺少合法的时间行（应为 "开始 --> 结束"）`)
    const start = parseSrtTime(m[1]!)
    const end = parseSrtTime(m[2]!)
    assertCueTime(start, end, index)
    const textLines = lines[0]!.includes('-->') ? lines.slice(1) : lines.slice(2)
    const cueText = textLines.join('\n').trim()
    if (cueText === '') throw new Error(`第 ${index} 条字幕没有文本内容`)
    return { index, start, end, text: cueText }
  })
}

/**
 * 解析 WebVTT 字幕文本 → 字幕条目数组。
 * 允许缺少 "WEBVTT" 头；cue settings（如 position:50%）会被忽略。
 */
export function parseVtt(text: string): SubtitleCue[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim()
  if (normalized === '') throw new Error('字幕内容为空：没有可解析的字幕条目')
  const blocks = splitBlocks(normalized).filter(
    (b) => b !== 'WEBVTT' && !b.startsWith('WEBVTT\n') && !b.startsWith('WEBVTT '),
  )
  const cues: SubtitleCue[] = []
  for (const block of blocks) {
    if (block.startsWith('NOTE')) continue
    const lines = block.split('\n')
    const timeIdx = lines.findIndex((l) => l.includes('-->'))
    if (timeIdx < 0)
      throw new Error(`字幕块缺少合法的时间行：${JSON.stringify(block.slice(0, 40))}`)
    const m = /^(.*?)\s*-->\s*([^\s]+)/.exec(lines[timeIdx]!)
    if (!m) throw new Error('字幕时间行格式非法')
    const start = parseVttTime(m[1]!)
    const end = parseVttTime(m[2]!)
    const index = cues.length + 1
    assertCueTime(start, end, index)
    const cueText = lines
      .slice(timeIdx + 1)
      .join('\n')
      .replace(/<[^>]*>/g, '')
      .trim()
    if (cueText === '') throw new Error(`第 ${index} 条字幕没有文本内容`)
    cues.push({ index, start, end, text: cueText })
  }
  if (cues.length === 0) throw new Error('字幕内容为空：没有可解析的字幕条目')
  return cues
}

/** 字幕格式探测：'srt' | 'vtt'；无法识别抛中文错 */
export function detectSubtitleFormat(text: string): 'srt' | 'vtt' {
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('字幕内容为空')
  if (/^WEBVTT(\s|$)/.test(trimmed)) return 'vtt'
  if (trimmed.includes('-->')) {
    // VTT 时间行用点分隔毫秒，SRT 用逗号；无 WEBVTT 头时以此区分
    const timeLine = trimmed.split('\n').find((l) => l.includes('-->'))!
    if (/\d\.\d{3}\s*-->/.test(timeLine) || /-->\s*\d{2,}:\d{2}:\d{2}\./.test(timeLine))
      return 'vtt'
    return 'srt'
  }
  throw new Error(
    '无法识别字幕格式：需要 SRT 或 WebVTT（时间行形如 "00:00:01,000 --> 00:00:04,000"）',
  )
}

/** 自动识别格式并解析；空文本抛中文错 */
export function normalizeSubtitles(text: string): SubtitleCue[] {
  const format = detectSubtitleFormat(text)
  return format === 'vtt' ? parseVtt(text) : parseSrt(text)
}

/** 字幕条目 → 标准 SRT 文本（烧录前统一写入 ffmpeg 虚拟文件系统） */
export function cuesToSrt(cues: readonly SubtitleCue[]): string {
  if (cues.length === 0) throw new Error('没有字幕条目可导出')
  return (
    cues
      .map(
        (cue, i) =>
          `${i + 1}\n${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}\n${cue.text}`,
      )
      .join('\n\n') + '\n'
  )
}

// ---------------------------------------------------------------------------
// 烧录样式与 ffmpeg 参数
// ---------------------------------------------------------------------------

/** 校验烧录样式；非法抛中文错 */
export function validateBurnStyle(style: BurnStyle): void {
  if (!Number.isInteger(style.fontSize) || style.fontSize < 8 || style.fontSize > 96) {
    throw new Error(`字号非法：${String(style.fontSize)}（应为 8～96 的整数）`)
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(style.fontColor)) {
    throw new Error(`字体颜色非法："${style.fontColor}"（应为 #RRGGBB 格式）`)
  }
  if (!BURN_POSITIONS.includes(style.position)) {
    throw new Error(`字幕位置非法："${String(style.position)}"（可选：顶部 / 中部 / 底部）`)
  }
}

/** "#RRGGBB" → ASS 颜色 "&H00BBGGRR"（ASS 用 BGR 顺序） */
export function assColor(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!m) throw new Error(`字体颜色非法："${hex}"（应为 #RRGGBB 格式）`)
  const rr = m[1]!.slice(0, 2)
  const gg = m[1]!.slice(2, 4)
  const bb = m[1]!.slice(4, 6)
  return `&H00${bb}${gg}${rr}`.toUpperCase()
}

/** 转义 ffmpeg filter 中的路径：\ → \\，' → \'，: → \: */
export function escapeFilterPath(path: string): string {
  if (path === '') throw new Error('文件路径不能为空')
  return path.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:')
}

/**
 * 拼装烧录参数：subtitles 滤镜 + 样式（ASS force_style）。
 * 音频流直接拷贝（-c:a copy），只重编码视频。
 */
export function buildBurnArgs(
  videoIn: string,
  srtIn: string,
  videoOut: string,
  style: BurnStyle,
): string[] {
  validateBurnStyle(style)
  if (videoIn === '' || srtIn === '' || videoOut === '') {
    throw new Error('输入 / 字幕 / 输出文件名不能为空')
  }
  const filter =
    `subtitles=${escapeFilterPath(srtIn)}:` +
    `force_style='FontSize=${style.fontSize},` +
    `PrimaryColour=${assColor(style.fontColor)},` +
    `Alignment=${ASS_ALIGNMENT[style.position]}'`
  return ['-i', videoIn, '-vf', filter, '-c:a', 'copy', videoOut]
}

/** 烧录结果文件名：原名（去扩展名）+ -sub.mp4 */
export function burnFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}-sub.mp4`
}
