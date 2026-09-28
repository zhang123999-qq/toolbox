/**
 * subtitle-extract —— 字幕提取的纯函数层
 *
 * 解析 `ffmpeg -hide_banner -i <输入>` 的 stderr 拿到字幕流列表，
 * 再拼出提取命令参数。全部纯函数，不触碰浏览器 API，可在 node 下测试。
 * ffmpeg.wasm 的动态加载只允许出现在 Tool.tsx。
 */

/** 输出字幕格式 */
export const SUBTITLE_FORMATS = ['srt', 'vtt', 'ass'] as const
export type SubtitleFormat = (typeof SUBTITLE_FORMATS)[number]

/** 字幕格式中文名（供界面展示） */
export const SUBTITLE_FORMAT_LABELS: Record<SubtitleFormat, string> = {
  srt: 'SRT',
  vtt: 'WebVTT',
  ass: 'ASS',
}

/** 字幕格式 → ffmpeg 字幕编码器 */
const SUBTITLE_CODECS: Record<SubtitleFormat, string> = {
  srt: 'srt',
  vtt: 'webvtt',
  ass: 'ass',
}

/** 输出字幕格式的 MIME（供下载 Blob 用） */
export const SUBTITLE_MIME_TYPES: Record<SubtitleFormat, string> = {
  srt: 'application/x-subrip',
  vtt: 'text/vtt',
  ass: 'text/plain',
}

/** 字幕格式非法时抛中文错 */
export function assertValidSubtitleFormat(format: string): asserts format is SubtitleFormat {
  if (format !== 'srt' && format !== 'vtt' && format !== 'ass') {
    throw new Error(`输出字幕格式非法：“${format}”（可选 SRT / WebVTT / ASS）`)
  }
}

/** 一路字幕流（从 ffmpeg stderr 解析出） */
export interface SubtitleStream {
  /** 流序号：Stream #0:2 中的 2 */
  readonly streamIndex: number
  /** 第几路字幕流（0 起，供 -map 0:s:N 用） */
  readonly subIndex: number
  /** 编码器名：subrip / ass / mov_text / dvd_sub … */
  readonly codec: string
  /** 语言：eng / chi / jpn …，缺失时为 und */
  readonly language: string
  /** 括号里的备注：default / forced …，缺失时为空字符串 */
  readonly note: string
}

/**
 * ffmpeg 流信息行：
 *   Stream #0:2(eng): Subtitle: subrip (default)
 *   Stream #0:3: Subtitle: ass
 * 语言括号可能缺失，末尾备注括号也可能缺失。
 */
const STREAM_RE =
  /^\s*Stream #\d+:(\d+)(?:\(([a-z]{2,3})\))?: Subtitle: ([A-Za-z0-9_]+)(?: \((.*)\))?$/

/** 时长行：Duration: 00:01:23.45 */
const DURATION_RE = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/

/**
 * 解析 ffmpeg `-i` 输出的 stderr，提取字幕流列表（纯函数）。
 * 非字幕流（Video/Audio/Data…）自动跳过；兼容 \r\n 换行。
 */
export function parseSubtitleStreams(stderr: string): SubtitleStream[] {
  const streams: SubtitleStream[] = []
  for (const rawLine of stderr.split('\n')) {
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine
    const m = STREAM_RE.exec(line)
    if (!m) continue
    streams.push({
      streamIndex: Number(m[1]),
      subIndex: streams.length,
      codec: m[3]!,
      language: m[2] ?? 'und',
      note: m[4] ?? '',
    })
  }
  return streams
}

/** 解析媒体时长（秒）：Duration: 00:01:23.45 → 83.45；没有则返回 null */
export function parseMediaDuration(stderr: string): number | null {
  const m = DURATION_RE.exec(stderr)
  if (!m) return null
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
}

/** 探测参数：只列流信息（ffmpeg 会以非 0 退出，stderr 里有流列表） */
export function probeArgs(inputName: string): string[] {
  return ['-hide_banner', '-i', inputName]
}

/**
 * 提取参数：-map 0:s:N 选中第 N 路字幕流，按目标格式转码。
 * subStreamIndex 是字幕相对序号（parseSubtitleStreams 的 subIndex）。
 */
export function buildExtractArgs(
  inputName: string,
  subStreamIndex: number,
  format: SubtitleFormat,
  outputName: string,
): string[] {
  assertValidSubtitleFormat(format)
  if (!Number.isInteger(subStreamIndex) || subStreamIndex < 0) {
    throw new Error(`字幕流序号非法：${String(subStreamIndex)}（应为 ≥ 0 的整数）`)
  }
  return [
    '-hide_banner',
    '-y',
    '-i',
    inputName,
    '-map',
    `0:s:${subStreamIndex}`,
    '-c:s',
    SUBTITLE_CODECS[format],
    outputName,
  ]
}

/** 字幕结果文件名：原名（去扩展名）+ -sub{序号}.{格式} */
export function subtitleFileName(
  inputName: string,
  subStreamIndex: number,
  format: SubtitleFormat,
): string {
  assertValidSubtitleFormat(format)
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}-sub${subStreamIndex}.${format}`
}

/** 秒 → "1.23 秒" */
export function formatSeconds(sec: number): string {
  return `${sec.toFixed(2)} 秒`
}

/** 字节数 → 人类可读（B / KiB / MiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}
