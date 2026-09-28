/**
 * merge-batch 纯函数：参数解析、分组、拼接布局计算、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_GROUP_SIZE = 3
export const MIN_GROUP_SIZE = 2
export const MAX_GROUP_SIZE = 10
export const DEFAULT_GAP = 0
export const MAX_GAP = 100
export const DEFAULT_QUALITY = 80
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 总张数上限 30：解码后位图常驻内存，30 张高清图已是内存安全边界，README 说明 */
export const MAX_TOTAL_FILES = 30

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析每组张数 2–10；空串用默认 3 */
export function parseGroupSize(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_GROUP_SIZE
  if (!/^\d+$/.test(t))
    throw new Error(`组大小无效：${raw}（须为 ${MIN_GROUP_SIZE}–${MAX_GROUP_SIZE} 的整数）`)
  const n = Number(t)
  if (n < MIN_GROUP_SIZE || n > MAX_GROUP_SIZE)
    throw new Error(`组大小超出范围：${raw}（须为 ${MIN_GROUP_SIZE}–${MAX_GROUP_SIZE} 的整数）`)
  return n
}

/** 解析间距 0–100px；空串用默认 0 */
export function parseGap(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_GAP
  if (!/^\d+$/.test(t)) throw new Error(`间距无效：${raw}（须为 0–${MAX_GAP} 的整数）`)
  const g = Number(t)
  if (g > MAX_GAP) throw new Error(`间距超出范围：${raw}（须为 0–${MAX_GAP} 的整数）`)
  return g
}

/** 解析背景色 #rrggbb；非法抛错 */
export function parseBgColor(raw: string): string {
  const t = raw.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(t)) throw new Error(`背景色无效：${raw}（须为 #rrggbb 格式）`)
  return t
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

/**
 * 按每组 n 张切分文件列表（保持原顺序）。
 * 最后一组不足 n 张时原样保留（若只有 1 张，调用方直接输出不拼接）。
 */
export function chunkFiles<T>(files: T[], n: number): T[][] {
  if (!Number.isInteger(n) || n < 1) throw new Error('分组大小无效')
  const groups: T[][] = []
  for (let i = 0; i < files.length; i += n) {
    groups.push(files.slice(i, i + n))
  }
  return groups
}

export interface MergeImageSize {
  w: number
  h: number
}

export interface MergeOffset {
  x: number
  y: number
}

/**
 * 计算一组图片的拼接布局：输出总尺寸 + 每张图的绘制偏移（原尺寸，不拉伸）。
 * 横向：总宽=sum(w)+gap*(n-1)，总高=max(h)；
 *   对齐为横向时的垂直对齐：start=顶部对齐（y=0），center=垂直居中。
 * 纵向：总高=sum(h)+gap*(n-1)，总宽=max(w)；
 *   对齐为纵向时的水平对齐：start=左对齐（x=0），center=水平居中。
 */
export function computeMergeLayout(
  sizes: MergeImageSize[],
  direction: 'horizontal' | 'vertical',
  gap: number,
  align: 'center' | 'start',
): { width: number; height: number; offsets: MergeOffset[] } {
  if (sizes.length === 0) throw new Error('图片列表为空，无法拼接')
  for (const s of sizes) {
    if (!Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) {
      throw new Error('图片尺寸无效')
    }
  }
  if (!Number.isFinite(gap) || gap < 0) throw new Error('间距无效')

  if (direction === 'horizontal') {
    const height = Math.max(...sizes.map((s) => s.h))
    const width = sizes.reduce((acc, s) => acc + s.w, 0) + gap * (sizes.length - 1)
    let x = 0
    const offsets = sizes.map((s) => {
      const y = align === 'start' ? 0 : (height - s.h) / 2
      const o = { x, y }
      x += s.w + gap
      return o
    })
    return { width, height, offsets }
  }

  const width = Math.max(...sizes.map((s) => s.w))
  const height = sizes.reduce((acc, s) => acc + s.h, 0) + gap * (sizes.length - 1)
  let y = 0
  const offsets = sizes.map((s) => {
    const x = align === 'start' ? 0 : (width - s.w) / 2
    const o = { x, y }
    y += s.h + gap
    return o
  })
  return { width, height, offsets }
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

/**
 * 构造某组的输出文件名：取组内第一张图的文件名做基名 + `-merged-<组号>` 后缀，
 * 按输出格式替换扩展名。组号从 1 开始。
 */
export function buildOutputFileName(
  firstName: string,
  groupIndex: number,
  format: 'jpeg' | 'png' | 'webp',
): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = firstName.replace(/\.[a-z0-9]+$/i, '') || 'batch'
  return `${base}-merged-${groupIndex}.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验总张数上限（内存安全边界） */
export function assertTotalCountOk(count: number): void {
  if (count > MAX_TOTAL_FILES) {
    throw new Error(`图片过多：上限 ${MAX_TOTAL_FILES} 张（内存安全边界）`)
  }
}
