/**
 * image-flip 纯函数：翻转选项校验、变换参数、输出参数。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 翻转复选框状态（纯数据） */
export interface FlipFlags {
  horizontal: boolean
  vertical: boolean
}

export const DEFAULT_QUALITY = 80
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * 校验翻转选项：至少勾选一种翻转方式。
 * 把「两个都不选 = 不可表示」做进校验，调用方禁止静默输出原图。
 */
export function parseFlipOptions(opts: FlipFlags): FlipFlags {
  if (!opts.horizontal && !opts.vertical) {
    throw new Error('请至少选择一种翻转方式')
  }
  return { horizontal: opts.horizontal, vertical: opts.vertical }
}

/**
 * 翻转变换的纯数据表达：供 canvas ctx.scale(scaleX, scaleY) 使用。
 * 四种组合：无翻转(1,1)／仅水平(-1,1)／仅垂直(1,-1)／双选(-1,-1，即旋转 180°)。
 */
export function flipTransform(opts: FlipFlags): { scaleX: number; scaleY: number } {
  return {
    scaleX: opts.horizontal ? -1 : 1,
    scaleY: opts.vertical ? -1 : 1,
  }
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

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-flipped.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
