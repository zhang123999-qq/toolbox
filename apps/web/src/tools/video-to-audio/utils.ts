/**
 * video-to-audio —— 视频转音频的纯函数层
 *
 * 本文件只放纯函数：格式/比特率校验、ffmpeg 参数组装（-vn 丢弃视频流）、
 * 输出文件名与 MIME。真正的 ffmpeg.wasm 调用（动态 import）在 Tool.tsx 中，
 * 加载失败时中文提示并优雅降级。
 */

// ---------------------------------------------------------------------------
// 格式定义
// ---------------------------------------------------------------------------

/** 支持的输出音频格式 */
export const EXTRACT_FORMATS = ['mp3', 'wav', 'ogg', 'flac'] as const
export type ExtractFormat = (typeof EXTRACT_FORMATS)[number]

/** 目标比特率区间（kbps）：整数，32～320（wav/flac 为无损，不用此参数） */
export const MIN_BITRATE_KBPS = 32
export const MAX_BITRATE_KBPS = 320

/** 有损格式（需要比特率参数） */
export const LOSSY_FORMATS: readonly ExtractFormat[] = ['mp3', 'ogg']

/** 输出格式白名单校验 */
export function validateExtractFormat(format: string): asserts format is ExtractFormat {
  if (!(EXTRACT_FORMATS as readonly string[]).includes(format)) {
    throw new Error(`不支持的输出格式：${format}（支持：${EXTRACT_FORMATS.join(' / ')}）`)
  }
}

/** 比特率校验 */
export function validateBitrateKbps(bitrate: number): void {
  if (!Number.isInteger(bitrate) || bitrate < MIN_BITRATE_KBPS || bitrate > MAX_BITRATE_KBPS) {
    throw new Error(
      `比特率非法：${String(bitrate)}（应为 ${MIN_BITRATE_KBPS}～${MAX_BITRATE_KBPS} 的整数，单位 kbps）`,
    )
  }
}

/** 该格式是否为有损（决定报告文案是否展示比特率） */
export function isLossyFormat(format: ExtractFormat): boolean {
  return (LOSSY_FORMATS as readonly string[]).includes(format)
}

// ---------------------------------------------------------------------------
// ffmpeg 参数组装
// ---------------------------------------------------------------------------

/**
 * 组装 ffmpeg 参数：-vn 丢弃视频流只保留音轨。
 * 有损格式带 -b:a 比特率；wav 用 pcm_s16le；flac 无损不带比特率。
 */
export function buildExtractAudioArgs(
  inputName: string,
  outputName: string,
  format: ExtractFormat,
  bitrateKbps: number,
): string[] {
  validateBitrateKbps(bitrateKbps)
  const args = ['-i', inputName, '-vn']
  switch (format) {
    case 'mp3':
      args.push('-c:a', 'libmp3lame', '-b:a', `${bitrateKbps}k`)
      break
    case 'ogg':
      args.push('-c:a', 'libvorbis', '-b:a', `${bitrateKbps}k`)
      break
    case 'wav':
      args.push('-c:a', 'pcm_s16le')
      break
    case 'flac':
      args.push('-c:a', 'flac')
      break
  }
  args.push(outputName)
  return args
}

/** 输入文件名 → 输出音频文件名（替换扩展名） */
export function extractFileName(inputName: string, format: ExtractFormat): string {
  validateExtractFormat(format)
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}.${format}`
}

/** 输出格式 → Blob MIME（供下载） */
export function extractMimeType(format: ExtractFormat): string {
  switch (format) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'ogg':
      return 'audio/ogg'
    case 'flac':
      return 'audio/flac'
  }
}

/** 字节数 → 人类可读（B / KiB / MiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}
