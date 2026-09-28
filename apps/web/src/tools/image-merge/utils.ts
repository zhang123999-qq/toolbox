/**
 * image-merge 纯函数：参数解析、拼接布局计算、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_COLUMNS = 3
export const MAX_COLUMNS = 10
export const DEFAULT_GAP = 0
export const MAX_GAP = 200
export const DEFAULT_QUALITY = 85
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析网格列数 1–10；空串用默认 3 */
export function parseColumns(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_COLUMNS
  if (!/^\d+$/.test(t)) throw new Error(`列数无效：${raw}（须为 1–${MAX_COLUMNS} 的整数）`)
  const c = Number(t)
  if (c < 1 || c > MAX_COLUMNS)
    throw new Error(`列数超出范围：${raw}（须为 1–${MAX_COLUMNS} 的整数）`)
  return c
}

/** 解析间距 0–200px；空串用默认 0 */
export function parseGap(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_GAP
  if (!/^\d+$/.test(t)) throw new Error(`间距无效：${raw}（须为 0–${MAX_GAP} 的整数）`)
  const g = Number(t)
  if (g > MAX_GAP) throw new Error(`间距超出范围：${raw}（须为 0–${MAX_GAP} 的整数）`)
  return g
}

/** 解析质量 1–100；空串用默认 85 */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
}

/** 解析背景色 #rrggbb；非法抛错 */
export function parseBgColor(raw: string): string {
  const t = raw.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(t)) throw new Error(`背景色无效：${raw}（须为 #rrggbb 格式）`)
  return t
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

/** 构造输出文件名：merged-<yyyymmdd-hhmmss>.<ext>；时间戳由调用方传入 Date，保证可测 */
export function buildOutputFileName(now: Date, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`
  return `merged-${stamp}.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验图片数量：至少 2 张才可拼接 */
export function assertEnoughImages(count: number): void {
  if (count < 2) {
    throw new Error('至少需要 2 张图片才能拼接')
  }
}

export interface MergeSize {
  w: number
  h: number
}

export interface MergeLayoutOptions {
  direction: 'horizontal' | 'vertical' | 'grid'
  columns: number
  gap: number
  align: 'top' | 'center' | 'bottom' | 'left' | 'right'
}

export interface MergePlacement {
  x: number
  y: number
  w: number
  h: number
}

/**
 * 计算拼接布局：输出总尺寸 + 每张图的放置位置（原尺寸，不拉伸）。
 * 横向：总宽=sum(w)+gap*(n-1)，总高=max(h)，y 按垂直对齐 top/center/bottom；
 * 纵向：总高=sum(h)+gap*(n-1)，总宽=max(w)，x 按水平对齐 left/center/right；
 * 网格：按 columns 分行，列宽=该列最大 w，行高=该行最大 h，x 按列累加、y 按行累加（align 忽略）。
 */
export function computeMergeLayout(
  sizes: MergeSize[],
  opts: MergeLayoutOptions,
): { width: number; height: number; placements: MergePlacement[] } {
  if (sizes.length === 0) throw new Error('图片列表为空，无法拼接')
  for (const s of sizes) {
    if (!Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) {
      throw new Error('图片尺寸无效')
    }
  }
  const { direction, columns, gap, align } = opts
  if (!Number.isInteger(columns) || columns < 1) throw new Error('列数无效')
  if (!Number.isFinite(gap) || gap < 0) throw new Error('间距无效')

  if (direction === 'horizontal') {
    const height = Math.max(...sizes.map((s) => s.h))
    const width = sizes.reduce((acc, s) => acc + s.w, 0) + gap * (sizes.length - 1)
    let x = 0
    const placements = sizes.map((s) => {
      const y = align === 'top' ? 0 : align === 'bottom' ? height - s.h : (height - s.h) / 2
      const p = { x, y, w: s.w, h: s.h }
      x += s.w + gap
      return p
    })
    return { width, height, placements }
  }

  if (direction === 'vertical') {
    const width = Math.max(...sizes.map((s) => s.w))
    const height = sizes.reduce((acc, s) => acc + s.h, 0) + gap * (sizes.length - 1)
    let y = 0
    const placements = sizes.map((s) => {
      const x = align === 'left' ? 0 : align === 'right' ? width - s.w : (width - s.w) / 2
      const p = { x, y, w: s.w, h: s.h }
      y += s.h + gap
      return p
    })
    return { width, height, placements }
  }

  // 网格：列宽=该列最大 w，行高=该行最大 h
  const usedCols = Math.min(columns, sizes.length)
  const rows = Math.ceil(sizes.length / columns)
  const colWidths = new Array<number>(usedCols).fill(0)
  const rowHeights = new Array<number>(rows).fill(0)
  sizes.forEach((s, i) => {
    const c = i % columns
    const r = Math.floor(i / columns)
    colWidths[c] = Math.max(colWidths[c], s.w)
    rowHeights[r] = Math.max(rowHeights[r], s.h)
  })
  const colX: number[] = []
  let acc = 0
  for (const w of colWidths) {
    colX.push(acc)
    acc += w + gap
  }
  const rowY: number[] = []
  acc = 0
  for (const h of rowHeights) {
    rowY.push(acc)
    acc += h + gap
  }
  const placements = sizes.map((s, i) => ({
    x: colX[i % columns],
    y: rowY[Math.floor(i / columns)],
    w: s.w,
    h: s.h,
  }))
  const width = colWidths.reduce((a, w) => a + w, 0) + gap * (usedCols - 1)
  const height = rowHeights.reduce((a, h) => a + h, 0) + gap * (rows - 1)
  return { width, height, placements }
}
