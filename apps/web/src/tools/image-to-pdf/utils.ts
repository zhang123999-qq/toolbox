/**
 * image-to-pdf 纯函数：列表排序、页边距解析、页面版式计算、文件名构造、嵌入方式判定。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 单文件上限 50MB（每文件单独校验；浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 页边距上限 50mm */
export const MAX_MARGIN_MM = 50
/** 毫米 → PDF 点（1pt = 1/72 英寸，1 英寸 = 25.4mm） */
export const MM_TO_PT = 72 / 25.4
/** A4 页面尺寸（pt） */
export const A4_SIZE = { width: 595.28, height: 841.89 } as const
/** Letter 页面尺寸（pt） */
export const LETTER_SIZE = { width: 612, height: 792 } as const

/** 页面尺寸模式：fit=适应图片，a4，letter */
export type PageSizeMode = 'fit' | 'a4' | 'letter'
/** 图片嵌入方式：jpg/png 直接嵌入，其余格式先转 PNG */
export type EmbedKind = 'jpg' | 'png' | 'convert'

/** 页面版式：页面尺寸 + 图片在页内的绘制矩形（pt） */
export interface PageLayout {
  pageW: number
  pageH: number
  drawW: number
  drawH: number
  x: number
  y: number
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * 移动列表项：index 处元素沿 dir（-1 上移 / 1 下移）移动一位。
 * 索引越界或目标越界时返回原数组的拷贝，不抛错、不改原数组。
 */
export function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list]
  if (!Number.isInteger(index) || index < 0 || index >= next.length) return next
  const target = index + dir
  if (target < 0 || target >= next.length) return next
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)
  return next
}

/** 删除列表项：索引越界时返回原数组的拷贝，不抛错、不改原数组 */
export function removeItem<T>(list: T[], index: number): T[] {
  const next = [...list]
  if (!Number.isInteger(index) || index < 0 || index >= next.length) return next
  next.splice(index, 1)
  return next
}

/** 解析页边距 mm：空串用默认 0；范围 0–50；非法抛错 */
export function parseMarginMm(raw: string): number {
  const text = raw.trim()
  if (text === '') return 0
  if (!/^-?\d+(\.\d+)?$/.test(text))
    throw new Error(`页边距无效：${raw}（须为 0–${MAX_MARGIN_MM} 的数字，单位 mm）`)
  const value = Number(text)
  if (value < 0 || value > MAX_MARGIN_MM) {
    throw new Error(`页边距超出范围：${raw}（须为 0–${MAX_MARGIN_MM} mm）`)
  }
  return value
}

/**
 * 计算页面版式：fit 模式页面 = 图片尺寸 + 两倍边距；
 * a4 / letter 为固定页面尺寸；图片在页内按边距等比适配并居中。
 */
export function computePageSize(
  mode: PageSizeMode,
  imgW: number,
  imgH: number,
  marginMm: number,
): PageLayout {
  if (!Number.isFinite(imgW) || !Number.isFinite(imgH) || imgW <= 0 || imgH <= 0) {
    throw new Error('图片尺寸无效')
  }
  const marginPt = marginMm * MM_TO_PT
  let pageW: number
  let pageH: number
  if (mode === 'fit') {
    pageW = imgW + marginPt * 2
    pageH = imgH + marginPt * 2
  } else if (mode === 'a4') {
    pageW = A4_SIZE.width
    pageH = A4_SIZE.height
  } else {
    pageW = LETTER_SIZE.width
    pageH = LETTER_SIZE.height
  }
  const availW = Math.max(1, pageW - marginPt * 2)
  const availH = Math.max(1, pageH - marginPt * 2)
  const scale = Math.min(availW / imgW, availH / imgH)
  const drawW = imgW * scale
  const drawH = imgH * scale
  const x = marginPt + (availW - drawW) / 2
  const y = marginPt + (availH - drawH) / 2
  return { pageW, pageH, drawW, drawH, x, y }
}

/** 构造输出文件名：首图名 + 后缀替换为 -merged.pdf */
export function buildOutputFileName(firstFileName: string): string {
  const base = firstFileName.replace(/\.[a-z0-9]+$/i, '') || 'images'
  return `${base}-merged.pdf`
}

/** 校验上传文件大小（每文件单独校验） */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 判定图片嵌入方式：jpeg→jpg 直接嵌入，png→png 直接嵌入，
 * 其余（webp/gif/bmp/avif 等）→convert，需先经 Canvas 转 PNG。
 */
export function detectEmbedKind(fileType: string): EmbedKind {
  const type = fileType.trim().toLowerCase()
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  return 'convert'
}
