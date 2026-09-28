/**
 * video-compress —— 视频压缩的纯函数层
 *
 * 本文件只放纯函数：档位校验、CRF 映射、ffmpeg 参数组装、输出文件名与 MIME。
 * 真正的 ffmpeg.wasm 调用（动态 import）在 Tool.tsx 中，加载失败时中文提示并优雅降级。
 */

// ---------------------------------------------------------------------------
// 档位定义
// ---------------------------------------------------------------------------

/** 画质档位：high（清晰）/ medium（均衡）/ low（极限压缩） */
export const COMPRESS_QUALITIES = ['high', 'medium', 'low'] as const
export type CompressQuality = (typeof COMPRESS_QUALITIES)[number]

/** 目标分辨率：original（保持原分辨率）或按高度降采样 */
export const COMPRESS_RESOLUTIONS = ['original', '1080p', '720p', '480p'] as const
export type CompressResolution = (typeof COMPRESS_RESOLUTIONS)[number]

/** 画质档位 → x264 CRF（越大压缩越狠） */
export function qualityToCrf(quality: CompressQuality): number {
  switch (quality) {
    case 'high':
      return 23
    case 'medium':
      return 28
    case 'low':
      return 33
  }
}

/** 分辨率档位 → 目标高度（像素）；original 返回 0 表示不缩放 */
export function resolutionToHeight(resolution: CompressResolution): number {
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

/** 画质档位白名单校验 */
export function validateCompressQuality(quality: string): asserts quality is CompressQuality {
  if (!(COMPRESS_QUALITIES as readonly string[]).includes(quality)) {
    throw new Error(`画质档位非法：${quality}（支持：${COMPRESS_QUALITIES.join(' / ')}）`)
  }
}

/** 分辨率档位白名单校验 */
export function validateCompressResolution(
  resolution: string,
): asserts resolution is CompressResolution {
  if (!(COMPRESS_RESOLUTIONS as readonly string[]).includes(resolution)) {
    throw new Error(`目标分辨率非法：${resolution}（支持：${COMPRESS_RESOLUTIONS.join(' / ')}）`)
  }
}

// ---------------------------------------------------------------------------
// ffmpeg 参数组装
// ---------------------------------------------------------------------------

/**
 * 组装 ffmpeg 参数：H.264 + CRF 控质，medium 预设；
 * 降分辨率用 scale=-2:高度（宽度按比例，偶数对齐）；
 * 音频重编码为 AAC 128k。输出固定 MP4 容器。
 */
export function buildCompressArgs(
  inputName: string,
  outputName: string,
  quality: CompressQuality,
  resolution: CompressResolution,
): string[] {
  const args = [
    '-i',
    inputName,
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    String(qualityToCrf(quality)),
  ]
  const height = resolutionToHeight(resolution)
  if (height > 0) args.push('-vf', `scale=-2:${height}`)
  args.push('-c:a', 'aac', '-b:a', '128k', outputName)
  return args
}

/** 输入文件名 → 压缩输出文件名（固定 .mp4） */
export function compressFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}-compressed.mp4`
}

/** 压缩输出的 Blob MIME */
export function compressMimeType(): string {
  return 'video/mp4'
}

/** 字节数 → 人类可读（B / KiB / MiB） */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) throw new Error(`字节数非法：${String(bytes)}`)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}
