/**
 * svg-optimize-img 纯函数：文件校验、SVG 文本断言、选项解析、文件名与统计文本构造。
 * 不触碰 DOM，可 100% 单测。svgo 调用放在 Tool 层（便于 mock），这里只做纯逻辑。
 */
import type { SvgOptimizeImgOptions } from './schema'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

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

/** 是否为 SVG 文件：MIME 为 image/svg+xml，或文件名以 .svg 结尾 */
export function isSvgFile(file: File): boolean {
  if (file.type === 'image/svg+xml') return true
  return /\.svg$/i.test(file.name)
}

/** 断言文本是有效 SVG：非空且包含 <svg 标签 */
export function assertSvgText(text: string): void {
  if (text.trim() === '') throw new Error('文件为空：请选择包含 SVG 内容的文件')
  if (!/<svg[\s>]/.test(text)) throw new Error('不是有效的 SVG：内容中未找到 <svg 标签')
}

/** 运行时选项（布尔形态） */
export interface SvgRuntimeOptions {
  multipass: boolean
  pretty: boolean
}

/** 把 'on'/'off' 选项解析为布尔 */
export function parseOptions(opts: SvgOptimizeImgOptions): SvgRuntimeOptions {
  return {
    multipass: opts.multipass === 'on',
    pretty: opts.pretty === 'on',
  }
}

/** 构造输出文件名：原名去扩展名 + -optimized.svg */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-optimized.svg`
}

/** 压缩率文本：new/orig，保留 1 位小数 */
export function compressionRatioText(origBytes: number, newBytes: number): string {
  if (origBytes <= 0) return '—'
  const ratio = (newBytes / origBytes) * 100
  return `${ratio.toFixed(1)}%`
}
