/**
 * video-transcode —— 视频转码的纯函数层
 *
 * 本文件只放纯函数：容器/分辨率校验、容器→编码映射、ffmpeg 参数组装、
 * 输出文件名与 MIME。真正的 ffmpeg.wasm 调用（动态 import）在 Tool.tsx 中，
 * 加载失败时中文提示并优雅降级。
 */

// ---------------------------------------------------------------------------
// 容器与分辨率定义
// ---------------------------------------------------------------------------

/** 支持的目标容器 */
export const TRANSCODE_FORMATS = ['mp4', 'webm', 'mov', 'mkv'] as const
export type TranscodeFormat = (typeof TRANSCODE_FORMATS)[number]

/** 目标分辨率：original（保持原分辨率）或按高度降采样 */
export const TRANSCODE_RESOLUTIONS = ['original', '1080p', '720p', '480p'] as const
export type TranscodeResolution = (typeof TRANSCODE_RESOLUTIONS)[number]

/** 容器 → 视频/音频编码器 */
export interface TranscodeCodecs {
  readonly vcodec: string
  readonly acodec: string
}

export function codecsForFormat(format: TranscodeFormat): TranscodeCodecs {
  switch (format) {
    case 'mp4':
      return { vcodec: 'libx264', acodec: 'aac' }
    case 'mov':
      return { vcodec: 'libx264', acodec: 'aac' }
    case 'mkv':
      return { vcodec: 'libx264', acodec: 'aac' }
    case 'webm':
      return { vcodec: 'libvpx-vp9', acodec: 'libopus' }
  }
}

/** 分辨率档位 → 目标高度（像素）；original 返回 0 表示不缩放 */
export function resolutionToHeight(resolution: TranscodeResolution): number {
  switch (resolution) {
    case 'original':
      return 0
    case '1080p':
      return 1080
    case '720p':
      return 720
    case '480p':
      return 480
  }
}

/** 容器白名单校验 */
export function validateTranscodeFormat(format: string): asserts format is TranscodeFormat {
  if (!(TRANSCODE_FORMATS as readonly string[]).includes(format)) {
    throw new Error(`目标容器非法：${format}（支持：${TRANSCODE_FORMATS.join(' / ')}）`)
  }
}

/** 分辨率档位白名单校验 */
export function validateTranscodeResolution(
  resolution: string,
): asserts resolution is TranscodeResolution {
  if (!(TRANSCODE_RESOLUTIONS as readonly string[]).includes(resolution)) {
    throw new Error(`目标分辨率非法：${resolution}（支持：${TRANSCODE_RESOLUTIONS.join(' / ')}）`)
  }
}

// ---------------------------------------------------------------------------
// ffmpeg 参数组装
// ---------------------------------------------------------------------------

/**
 * 组装 ffmpeg 参数：按目标容器选用编码器（mp4/mov/mkv 用 H.264+AAC，
 * webm 用 VP9+Opus）；降分辨率用 scale=-2:高度（宽度按比例，偶数对齐）。
 */
export function buildTranscodeArgs(
  inputName: string,
  outputName: string,
  format: TranscodeFormat,
  resolution: TranscodeResolution,
): string[] {
  const { vcodec, acodec } = codecsForFormat(format)
  const args = ['-i', inputName, '-c:v', vcodec, '-c:a', acodec]
  const height = resolutionToHeight(resolution)
  if (height > 0) args.push('-vf', `scale=-2:${height}`)
  args.push(outputName)
  return args
}

/** 输入文件名 → 转码输出文件名（替换扩展名为目标容器） */
export function transcodeFileName(inputName: string, format: TranscodeFormat): string {
  validateTranscodeFormat(format)
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}.${format}`
}

/** 目标容器 → Blob MIME（供下载） */
export function transcodeMimeType(format: TranscodeFormat): string {
  switch (format) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'mov':
      return 'video/quicktime'
    case 'mkv':
      return 'video/x-matroska'
  }
}

/** 字节数 → 人类可读（B / KiB / MiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}
