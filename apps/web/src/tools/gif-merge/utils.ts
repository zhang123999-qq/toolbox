/**
 * gif-merge 纯函数：参数解析、contain 绘制矩形、帧数/尺寸/文件校验、文件名构造。
 * 不触碰 DOM/Canvas/Web Worker，可 100% 单测。
 */

/** 帧延迟默认 200ms，范围 20–10000ms */
export const DEFAULT_DELAY = 200
export const MIN_DELAY = 20
export const MAX_DELAY = 10000

/** 循环次数默认 0（=无限循环），范围 0–100 */
export const DEFAULT_REPEAT = 0
export const MIN_REPEAT = 0
export const MAX_REPEAT = 100

/** 质量为 gif.js 的像素采样间隔，默认 10，范围 1–20（越小越清晰、文件越大） */
export const DEFAULT_QUALITY = 10
export const MIN_QUALITY = 1
export const MAX_QUALITY = 20

/** 至少 2 帧才能合成，最多 100 帧 */
export const MIN_FRAMES = 2
export const MAX_FRAMES = 100

/** 输出任一边上限 2048px（超限抛错） */
export const MAX_SIDE = 2048

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 整数区间解析：空串用 fallback；非整数或超范围抛错 */
function parseIntInRange(
  raw: string,
  fallback: number,
  min: number,
  max: number,
  label: string,
): number {
  const t = raw.trim()
  if (t === '') return fallback
  if (!/^\d+$/.test(t)) throw new Error(`${label}无效：${raw}（须为 ${min}–${max} 的整数）`)
  const v = Number(t)
  if (v < min || v > max) throw new Error(`${label}超出范围：${raw}（须为 ${min}–${max} 的整数）`)
  return v
}

/** 解析帧延迟 20–10000ms；空串用默认 200 */
export function parseDelay(raw: string): number {
  return parseIntInRange(raw, DEFAULT_DELAY, MIN_DELAY, MAX_DELAY, '帧延迟')
}

/** 解析循环次数 0–100；空串用默认 0（无限循环） */
export function parseRepeat(raw: string): number {
  return parseIntInRange(raw, DEFAULT_REPEAT, MIN_REPEAT, MAX_REPEAT, '循环次数')
}

/** 解析质量 1–20；空串用默认 10 */
export function parseQuality(raw: string): number {
  return parseIntInRange(raw, DEFAULT_QUALITY, MIN_QUALITY, MAX_QUALITY, '质量')
}

/** contain 等比缩放居中：把 srcW×srcH 放入 dstW×dstH，返回目标画布内的绘制矩形 */
export function computeContainRect(
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): { x: number; y: number; w: number; h: number } {
  for (const v of [srcW, srcH, dstW, dstH]) {
    if (!Number.isFinite(v) || v <= 0) throw new Error('尺寸无效')
  }
  const scale = Math.min(dstW / srcW, dstH / srcH)
  const w = Math.max(1, Math.round(srcW * scale))
  const h = Math.max(1, Math.round(srcH * scale))
  return {
    x: Math.round((dstW - w) / 2),
    y: Math.round((dstH - h) / 2),
    w,
    h,
  }
}

/** 合成前校验帧数：至少 2 帧 */
export function validateFrameCount(count: number): void {
  if (!Number.isInteger(count) || count < MIN_FRAMES) {
    throw new Error(`至少需要 ${MIN_FRAMES} 帧才能合成 GIF`)
  }
}

/** 添加时校验帧数上限：总量不得超过 100 帧 */
export function assertFrameLimit(total: number): void {
  if (total > MAX_FRAMES) {
    throw new Error(`帧数过多：上限 ${MAX_FRAMES} 帧`)
  }
}

/** 校验输出尺寸：任一边超过 2048px 抛错 */
export function validateOutputSize(width: number, height: number): void {
  if (width > MAX_SIDE || height > MAX_SIDE) {
    throw new Error(`尺寸过大：输出任一边上限 ${MAX_SIDE}px（当前 ${width}×${height}）`)
  }
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 构造输出文件名：以第一帧文件名 + 后缀 -merged.gif */
export function buildOutputFileName(firstFrameName: string): string {
  const base = firstFrameName.replace(/\.[a-z0-9]+$/i, '') || 'frames'
  return `${base}-merged.gif`
}
