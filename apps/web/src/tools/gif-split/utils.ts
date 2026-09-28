/**
 * gif-split 纯函数：文件/帧数/尺寸校验、delay 换算、帧文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 单个 GIF 最多分解帧数（decompressFrames 内存兜底） */
export const MAX_FRAMES = 200
/** GIF 逻辑屏宽/高上限（像素） */
export const MAX_GIF_DIMENSION = 4096

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 是否为 GIF 文件（MIME 优先，无 MIME 时按扩展名兜底） */
export function isGifFile(file: { type: string; name: string }): boolean {
  if (file.type === 'image/gif') return true
  return /\.gif$/i.test(file.name)
}

/** gifuct-js 解析结果的逻辑屏尺寸（与库解耦的最小结构类型，便于单测） */
interface ParsedGifScreen {
  lsd: { width: number; height: number }
}

/** 取 GIF 逻辑屏宽/高 */
export function getLogicalScreenSize(parsed: ParsedGifScreen): { width: number; height: number } {
  return { width: parsed.lsd.width, height: parsed.lsd.height }
}

/** 校验逻辑屏尺寸：须为正数且不超过上限 */
export function assertLogicalScreenOk(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('GIF 尺寸无效')
  }
  if (width > MAX_GIF_DIMENSION || height > MAX_GIF_DIMENSION) {
    throw new Error(`GIF 尺寸过大：逻辑屏宽/高上限 ${MAX_GIF_DIMENSION}px`)
  }
}

/** 校验帧数上限（decompressFrames 内存兜底） */
export function assertFrameCountOk(count: number): void {
  if (count > MAX_FRAMES) {
    throw new Error(`帧数过多：上限 ${MAX_FRAMES} 帧`)
  }
}

/** 校验单帧 patch 尺寸（损坏的 GIF 可能给出 0 尺寸帧） */
export function assertFrameDimsOk(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('GIF 帧尺寸无效')
  }
}

/** gifuct-js 的 delay 单位为 1/100 秒，换算为毫秒 */
export function delayToMs(delay: number): number {
  return delay * 10
}

/** 构造帧文件名：photo.gif → photo-frame-01.png（序号按总帧数位数补零） */
export function buildFrameFileName(originalName: string, index: number, total: number): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  const pad = Math.max(2, String(Math.max(1, total)).length)
  return `${base}-frame-${String(index).padStart(pad, '0')}.png`
}
