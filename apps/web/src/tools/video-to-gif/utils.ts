/**
 * video-to-gif —— 视频转 GIF 的纯函数层
 *
 * 本文件只放纯函数：参数校验、ffmpeg 参数组装、输出文件名与 MIME。
 * 真正的 ffmpeg.wasm 调用（动态 import）在 Tool.tsx 中，加载失败时中文提示并优雅降级。
 * 注意：本工具严禁引入 gif.js，GIF 编码全部交给 ffmpeg 的 gif 复用器。
 */

// ---------------------------------------------------------------------------
// 参数校验
// ---------------------------------------------------------------------------

/** 起始时间（秒）：≥ 0 */
export const MIN_START_SEC = 0
/** 片段时长（秒）：0.1～30，GIF 过长体积失控 */
export const MIN_DURATION_SEC = 0.1
export const MAX_DURATION_SEC = 30
/** 帧率：1～30 */
export const MIN_FPS = 1
export const MAX_FPS = 30
/** 输出宽度（像素）：64～1280 */
export const MIN_WIDTH = 64
export const MAX_WIDTH = 1280

/** GIF 转换参数（schema 校验后的数字形态） */
export interface GifConvertOptions {
  readonly startSec: number
  readonly durationSec: number
  readonly fps: number
  readonly width: number
}

/** 参数合法性校验；非法抛中文错 */
export function validateGifOptions(opts: GifConvertOptions): void {
  const { startSec, durationSec, fps, width } = opts
  if (!Number.isFinite(startSec) || startSec < MIN_START_SEC) {
    throw new Error(`起始时间非法：${String(startSec)}（应 ≥ ${MIN_START_SEC} 秒）`)
  }
  if (!Number.isFinite(durationSec) || durationSec < MIN_DURATION_SEC) {
    throw new Error(
      `片段时长非法：${String(durationSec)}（应为 ${MIN_DURATION_SEC}～${MAX_DURATION_SEC} 秒）`,
    )
  }
  if (durationSec > MAX_DURATION_SEC) {
    throw new Error(
      `片段时长非法：${String(durationSec)}（应为 ${MIN_DURATION_SEC}～${MAX_DURATION_SEC} 秒）`,
    )
  }
  if (!Number.isInteger(fps) || fps < MIN_FPS || fps > MAX_FPS) {
    throw new Error(`帧率非法：${String(fps)}（应为 ${MIN_FPS}～${MAX_FPS} 的整数）`)
  }
  if (!Number.isInteger(width) || width < MIN_WIDTH || width > MAX_WIDTH) {
    throw new Error(`输出宽度非法：${String(width)}（应为 ${MIN_WIDTH}～${MAX_WIDTH} 的整数像素）`)
  }
}

// ---------------------------------------------------------------------------
// ffmpeg 参数组装
// ---------------------------------------------------------------------------

/**
 * 组装 ffmpeg 参数：先 -ss/-t 精确切分（放 -i 之前加速 seek），
 * 再用 fps + scale 滤镜链控制帧率与宽度，输出 gif 复用器。
 */
export function buildGifArgs(
  inputName: string,
  outputName: string,
  opts: GifConvertOptions,
): string[] {
  validateGifOptions(opts)
  return [
    '-ss',
    String(opts.startSec),
    '-t',
    String(opts.durationSec),
    '-i',
    inputName,
    '-vf',
    `fps=${opts.fps},scale=${opts.width}:-1:flags=lanczos`,
    '-f',
    'gif',
    outputName,
  ]
}

/** 输入文件名 → 输出 GIF 文件名（替换扩展名） */
export function gifFileName(inputName: string): string {
  const base = inputName.replace(/\.[^.]*$/, '')
  return `${base === '' ? 'video' : base}.gif`
}

/** GIF 输出的 Blob MIME */
export function gifMimeType(): string {
  return 'image/gif'
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
