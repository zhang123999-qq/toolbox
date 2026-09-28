/**
 * compress-size 纯函数：目标大小解析、二分决策、尺寸缩小、文本构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 * 「给定质量→是否达标」的判定（blob.size <= targetBytes）是平凡比较，
 * 区间收敛/缩小决策全部收拢在下面几个纯函数里，与 Tool.tsx 的异步
 * canvas 编码彻底分离。
 */
import { formatBytes } from '../../lib/image'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 目标大小范围（KB）：1KB – 50MB */
export const TARGET_SIZE_MIN_KB = 1
export const TARGET_SIZE_MAX_KB = 50 * 1024
/** 质量二分区间 1–100 */
export const QUALITY_MIN = 1
export const QUALITY_MAX = 100
/** 二分最大迭代次数（防死循环；1–100 区间实际 ≤7 次收敛） */
export const MAX_PROBE_ITERATIONS = 20
/** 质量=1 仍超标时最多缩小轮数 */
export const MAX_SHRINK_ROUNDS = 3
/** 每轮缩小：面积 ×0.7 */
export const SHRINK_AREA_FACTOR = 0.7

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析目标大小：KB 字符串 → 字节；范围 1–51200KB */
export function parseTargetSize(raw: string): number {
  const t = raw.trim()
  if (t === '') throw new Error('目标大小不能为空（单位 KB，范围 1–51200）')
  if (!/^\d+$/.test(t)) throw new Error(`目标大小无效：${raw}（须为 1–51200 的整数 KB）`)
  const kb = Number(t)
  if (kb < TARGET_SIZE_MIN_KB || kb > TARGET_SIZE_MAX_KB) {
    throw new Error(`目标大小超出范围：${raw}（须为 1–51200 KB）`)
  }
  return kb * 1024
}

/** 二分下一步探测质量：纯决策函数，取区间中点 */
export function nextQualityProbe(low: number, high: number): number {
  return Math.floor((low + high) / 2)
}

/** 二分区间更新：达标则向高质量侧收敛（找满足目标的最大质量），否则向低质量侧收敛 */
export function narrowQualityRange(
  low: number,
  high: number,
  probe: number,
  hit: boolean,
): { low: number; high: number } {
  return hit ? { low: probe + 1, high } : { low, high: probe - 1 }
}

/** 缩小一轮：面积 ×0.7（等比），保底 1px */
export function shrinkForRetry(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效')
  }
  const scale = Math.sqrt(SHRINK_AREA_FACTOR)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * 是否允许再缩小一轮：轮数未用完（<3）且缩小后尺寸仍会变化。
 * 后者避免图片已压到 1px 时做无意义的重复编码（防死循环）。
 */
export function needsResize(width: number, height: number, shrinkRounds: number): boolean {
  if (shrinkRounds >= MAX_SHRINK_ROUNDS) return false
  const next = shrinkForRetry(width, height)
  return next.width < width || next.height < height
}

/** 无法达标时的错误文本：明确告知原因与出路，而非无限循环 */
export function unreachableErrorText(targetBytes: number): string {
  return (
    `无法压缩到目标大小（${formatBytes(targetBytes)}）：` +
    `即使质量降至 1 并缩小 ${MAX_SHRINK_ROUNDS} 轮仍超标，请调大目标大小后重试`
  )
}

/** 选项 format 转 MIME（仅 jpeg/webp） */
export function formatToMime(format: 'jpeg' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/webp'
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : 'webp'
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-targetsize.${ext}`
}

/** 结果统计输入 */
export interface AttemptSummary {
  attempts: number
  quality: number
  width: number
  height: number
  origSize: number
  newSize: number
}

/** 结果统计文本：尝试次数 / 最终质量 / 最终尺寸 / 原体积→新体积 */
export function attemptSummaryText(s: AttemptSummary): string {
  return (
    `尝试 ${s.attempts} 次，最终质量 ${s.quality}，` +
    `最终尺寸 ${s.width}×${s.height}，${formatBytes(s.origSize)} → ${formatBytes(s.newSize)}`
  )
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
