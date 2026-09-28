/**
 * image-batch 纯函数：参数解析、队列管理、文件名构造。
 * 不触碰 React/DOM/Canvas，可 100% 单测。
 * 参数解析语义与 image-compress（#421）保持一致；工具之间禁止互相 import，故各自实现。
 */

export const DEFAULT_QUALITY = 80
export const MAX_DIMENSION_LIMIT = 16384
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/**
 * 批量总数上限 20：处理时每张图同时驻留原图 Image、Canvas 位图与输出 Blob，
 * 该上限是内存安全边界，超出会直接报错（见 README）。
 */
export const MAX_BATCH_SIZE = 20
/** 并发处理上限 3：Canvas 编解码吃内存，并发过高易 OOM */
export const CONCURRENCY = 3

/** 队列单项状态：等待 / 处理中 / 成功 / 失败 */
export type BatchItemStatus = 'pending' | 'processing' | 'success' | 'error'

/** 队列项最小形状（组件侧再扩展 file/result 等运行时字段） */
export interface BatchQueueItem {
  id: number
  status: BatchItemStatus
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析质量 1–100；空串用默认 80 */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
}

/** 解析最大边；空串/0 = 不限；上限 16384 */
export function parseMaxDimension(raw: string): number {
  const t = raw.trim()
  if (t === '') return 0
  if (!/^\d+$/.test(t)) throw new Error(`尺寸无效：${raw}（须为非负整数，0 表示不限）`)
  const d = Number(t)
  if (d > MAX_DIMENSION_LIMIT) throw new Error(`尺寸过大：${raw}（上限 ${MAX_DIMENSION_LIMIT}）`)
  return d
}

/** 按最大边等比缩放；任一边超限才缩，不过限原样返回 */
export function computeOutputDimensions(
  srcW: number,
  srcH: number,
  maxDimension: number,
): { width: number; height: number } {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (maxDimension <= 0) return { width: srcW, height: srcH }
  const longest = Math.max(srcW, srcH)
  if (longest <= maxDimension) return { width: srcW, height: srcH }
  const scale = maxDimension / longest
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
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

/** 构造输出文件名：原名 + -batch 后缀，扩展名按格式替换（与单张工具的 -compressed 区分） */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-batch.${ext}`
}

/** 压缩率文本：new/orig，保留 1 位小数 */
export function compressionRatioText(origBytes: number, newBytes: number): string {
  if (origBytes <= 0) return '—'
  const ratio = (newBytes / origBytes) * 100
  return `${ratio.toFixed(1)}%`
}

/** 校验单文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验批量总数是否超出内存安全上限 */
export function assertBatchSizeOk(count: number): void {
  if (count > MAX_BATCH_SIZE) {
    throw new Error(`一次最多处理 ${MAX_BATCH_SIZE} 张图片（内存限制）`)
  }
}

/** 新建处理队列：id 为下标，全部 pending */
export function createQueue(count: number): BatchQueueItem[] {
  const items: BatchQueueItem[] = []
  for (let i = 0; i < count; i += 1) items.push({ id: i, status: 'pending' })
  return items
}

/** 已完成项计数（成功 + 失败都算完成，用于进度条） */
export function doneCount(items: ReadonlyArray<BatchQueueItem>): number {
  return items.filter((it) => it.status === 'success' || it.status === 'error').length
}

/** 进度百分比（0–100）；总数为 0 时返回 0，避免除零 */
export function progressPercent(done: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((done / total) * 100)
}
