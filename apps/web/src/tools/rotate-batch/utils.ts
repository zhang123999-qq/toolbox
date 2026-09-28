/**
 * rotate-batch 纯函数：角度解析/归一化、旋转包络矩形、文件名构造等。
 * 不触碰 DOM/Canvas，可 100% 单测。Canvas 旋转绘制需要 2D 上下文，放在 Tool.tsx 里。
 */
import type { RotateBatchOptions } from './schema'

export const DEFAULT_ANGLE = 0
export const MIN_ANGLE = -360
export const MAX_ANGLE = 360
export const DEFAULT_QUALITY = 90
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 批量总数上限 20（结果 Blob 常驻内存 + 解码位图峰值可控） */
export const MAX_FILES = 20
/** 最大并发 3（单张大图 Canvas 位图可达数百 MB，限并发保内存峰值） */
export const MAX_CONCURRENCY = 3

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析旋转角度：空串→0；须为 -360~360 的数字，可含小数；非法抛错 */
export function parseAngle(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_ANGLE
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(t)) {
    throw new Error(`角度无效：${raw}（须为 ${MIN_ANGLE}~${MAX_ANGLE} 的数字）`)
  }
  const a = Number(t)
  if (a < MIN_ANGLE || a > MAX_ANGLE) {
    throw new Error(`角度超出范围：${raw}（须为 ${MIN_ANGLE}~${MAX_ANGLE}）`)
  }
  return a
}

/** 角度归一化到 [0, 360) */
export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * 旋转后的包络矩形（纯数学）：宽 = |w·cosθ| + |h·sinθ|，高 = |w·sinθ| + |h·cosθ|。
 * 90° 奇数倍时三角函数值钳制为精确的 0/1，保证宽高精确互换；
 * 其余角度四舍五入取整，宽高至少 1，保证 Canvas 尺寸合法。
 */
export function rotatedSize(
  w: number,
  h: number,
  angleDeg: number,
): { width: number; height: number } {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (!Number.isFinite(angleDeg)) {
    throw new Error('角度无效')
  }
  const rad = (normalizeAngle(angleDeg) * Math.PI) / 180
  // 浮点误差钳制：cos(90°)≈6.1e-17 → 0，sin(90°)≈1 → 1
  const snap = (v: number): number => (v < 1e-9 ? 0 : v > 1 - 1e-9 ? 1 : v)
  const cos = snap(Math.abs(Math.cos(rad)))
  const sin = snap(Math.abs(Math.sin(rad)))
  return {
    width: Math.max(1, Math.round(w * cos + h * sin)),
    height: Math.max(1, Math.round(w * sin + h * cos)),
  }
}

/** 解析质量 1–100；空串用默认 90（旋转不做压缩意图，默认高质量） */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
}

/** 解析后的完整选项（批量处理前统一解析一次） */
export interface ParsedRotateOptions {
  angle: number
  format: 'jpeg' | 'png' | 'webp'
  quality: number
}

/** 统一解析全部选项；任一非法即抛错，调用方展示为全局错误 */
export function parseOptions(raw: RotateBatchOptions): ParsedRotateOptions {
  return {
    angle: parseAngle(raw.angle),
    format: raw.format,
    quality: parseQuality(raw.quality),
  }
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** PNG 为无损，质量参数不生效，返回 undefined 让调用方感知 */
export function effectiveQuality(
  format: 'jpeg' | 'png' | 'webp',
  quality: number,
): number | undefined {
  if (format === 'png') return undefined
  return quality / 100
}

/** 构造输出文件名：原名 + -rotated 后缀，扩展名按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-rotated.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
