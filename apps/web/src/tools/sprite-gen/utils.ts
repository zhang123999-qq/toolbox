/**
 * sprite-gen 纯函数：参数解析、雪碧图布局计算、坐标文本（JSON/CSS）生成、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 * （工具间禁止互相 import，布局逻辑独立实现，不复用其它工具的 utils）
 */

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 网格布局默认列数 */
export const DEFAULT_COLUMNS = 4
/** 列数上限 */
export const MAX_COLUMNS = 10
/** 间距上限（px） */
export const MAX_GAP = 100
/** JPEG 质量默认 90 */
export const DEFAULT_QUALITY = 90

export type SpriteDirection = 'horizontal' | 'vertical' | 'grid'

export interface SpriteLayoutOptions {
  direction: SpriteDirection
  columns: number
  gap: number
}

export interface SpritePlacement {
  x: number
  y: number
  w: number
  h: number
}

export interface SpriteLayout {
  width: number
  height: number
  placements: SpritePlacement[]
}

export interface SpriteItem {
  name: string
  x: number
  y: number
  w: number
  h: number
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析列数 1–10；空串用默认 4 */
export function parseColumns(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_COLUMNS
  if (!/^\d+$/.test(t)) throw new Error(`列数无效：${raw}（须为 1–${MAX_COLUMNS} 的整数）`)
  const c = Number(t)
  if (c < 1 || c > MAX_COLUMNS) {
    throw new Error(`列数超出范围：${raw}（须为 1–${MAX_COLUMNS} 的整数）`)
  }
  return c
}

/** 解析间距 0–100；空串用默认 0 */
export function parseGap(raw: string): number {
  const t = raw.trim()
  if (t === '') return 0
  if (!/^\d+$/.test(t)) throw new Error(`间距无效：${raw}（须为 0–${MAX_GAP} 的整数）`)
  const g = Number(t)
  if (g > MAX_GAP) throw new Error(`间距超出范围：${raw}（须为 0–${MAX_GAP} 的整数）`)
  return g
}

/** 解析质量 1–100；空串用默认 90（仅 JPEG 输出有效） */
export function parseQuality(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_QUALITY
  if (!/^\d+$/.test(t)) throw new Error(`质量无效：${raw}（须为 1–100 的整数）`)
  const q = Number(t)
  if (q < 1 || q > 100) throw new Error(`质量超出范围：${raw}（须为 1–100 的整数）`)
  return q
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验图片类型；supported 由调用方按 lib/image 的 isSupportedImageFile 判定后传入 */
export function assertSupportedImage(name: string, supported: boolean): void {
  if (!supported) {
    throw new Error(`不支持的图片格式：${name}`)
  }
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'png' | 'jpeg'): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png'
}

function assertValidSizes(sizes: { w: number; h: number }[]): void {
  if (sizes.length === 0) throw new Error('至少需要 1 张图片才能拼合')
  for (const s of sizes) {
    if (!Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) {
      throw new Error('图片尺寸无效')
    }
  }
}

/** 横向：总宽=宽之和+间距，总高=最高；每张 y=0，x 依次累加 */
function layoutHorizontal(sizes: { w: number; h: number }[], gap: number): SpriteLayout {
  let width = 0
  let height = 0
  const placements: SpritePlacement[] = []
  for (const s of sizes) {
    placements.push({ x: width, y: 0, w: s.w, h: s.h })
    width += s.w + gap
    if (s.h > height) height = s.h
  }
  width = Math.max(0, width - gap)
  return { width, height, placements }
}

/** 纵向：总高=高之和+间距，总宽=最宽；每张 x=0，y 依次累加 */
function layoutVertical(sizes: { w: number; h: number }[], gap: number): SpriteLayout {
  let width = 0
  let height = 0
  const placements: SpritePlacement[] = []
  for (const s of sizes) {
    placements.push({ x: 0, y: height, w: s.w, h: s.h })
    height += s.h + gap
    if (s.w > width) width = s.w
  }
  height = Math.max(0, height - gap)
  return { width, height, placements }
}

/**
 * 网格：按 columns 分行；列宽=该列最大 w，行高=该行最大 h；
 * 实际列数不超过图片数（避免尾部空列多算间距）。
 */
function layoutGrid(sizes: { w: number; h: number }[], gap: number, columns: number): SpriteLayout {
  const cols = Math.min(Math.max(1, Math.floor(columns)), sizes.length)
  const rows = Math.ceil(sizes.length / cols)
  const colWidths = new Array<number>(cols).fill(0)
  const rowHeights = new Array<number>(rows).fill(0)
  sizes.forEach((s, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    if (s.w > colWidths[c]) colWidths[c] = s.w
    if (s.h > rowHeights[r]) rowHeights[r] = s.h
  })
  const placements: SpritePlacement[] = []
  let y = 0
  for (let r = 0; r < rows; r++) {
    let x = 0
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c
      if (i >= sizes.length) break
      const s = sizes[i]
      placements.push({ x, y, w: s.w, h: s.h })
      x += colWidths[c] + gap
    }
    y += rowHeights[r] + gap
  }
  const width = colWidths.reduce((a, b) => a + b, 0) + gap * (cols - 1)
  const height = rowHeights.reduce((a, b) => a + b, 0) + gap * (rows - 1)
  return { width, height, placements }
}

/** 计算雪碧图总尺寸与每张子图的位置；空数组或非法尺寸抛错 */
export function computeSpriteLayout(
  sizes: { w: number; h: number }[],
  opts: SpriteLayoutOptions,
): SpriteLayout {
  assertValidSizes(sizes)
  if (opts.direction === 'horizontal') return layoutHorizontal(sizes, opts.gap)
  if (opts.direction === 'vertical') return layoutVertical(sizes, opts.gap)
  return layoutGrid(sizes, opts.gap, opts.columns)
}

/**
 * 文件名转合法 CSS 类名：去扩展名、小写；
 * 非 [a-z0-9-] 字符转 '-'（连续合并、去首尾）；
 * 首字符非字母时加 's-' 前缀；结果为空时兜底 'sprite'。
 */
export function cssClassName(name: string): string {
  const cleaned = name
    .replace(/\.[a-z0-9]+$/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
  if (cleaned === '') return 'sprite'
  if (!/^[a-z]/.test(cleaned)) return `s-${cleaned}`
  return cleaned
}

/** 坐标数据转 JSON 文本（2 空格缩进） */
export function buildSpriteJSON(items: SpriteItem[]): string {
  return JSON.stringify(items, null, 2)
}

/**
 * 坐标数据转 CSS 文本，每张一行：
 * .<class> { width: Wpx; height: Hpx; background: url(<spriteFileName>) -Xpx -Ypx; }
 */
export function buildSpriteCSS(items: SpriteItem[], spriteFileName: string): string {
  return items
    .map(
      (item) =>
        `.${cssClassName(item.name)} { width: ${item.w}px; height: ${item.h}px; ` +
        `background: url(${spriteFileName}) -${item.x}px -${item.y}px; }`,
    )
    .join('\n')
}

/** 构造输出文件名：固定 sprite.png / sprite.jpg */
export function buildOutputFileName(format: 'png' | 'jpeg'): string {
  return format === 'jpeg' ? 'sprite.jpg' : 'sprite.png'
}
