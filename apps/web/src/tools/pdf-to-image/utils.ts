/**
 * pdf-to-image 纯函数：DPI 解析、页码选择解析、渲染尺寸校验、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 支持的 DPI 取值 */
export const DPI_VALUES = ['72', '150', '300'] as const
export type DpiValue = (typeof DPI_VALUES)[number]
/** 默认 DPI */
export const DEFAULT_DPI: DpiValue = '150'
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** Canvas 单边像素上限（主流浏览器的安全边界） */
export const MAX_CANVAS_DIMENSION = 16384
/** Canvas 总像素上限 */
export const MAX_CANVAS_PIXELS = MAX_CANVAS_DIMENSION * MAX_CANVAS_DIMENSION

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析 DPI；空串用默认 150 */
export function parseDpi(raw: string): DpiValue {
  const t = raw.trim()
  if (t === '') return DEFAULT_DPI
  if (t === '72' || t === '150' || t === '300') return t
  throw new Error(`DPI 无效：${raw}（仅支持 72 / 150 / 300）`)
}

/** DPI → 渲染缩放比例（PDF 基准分辨率为 72 DPI） */
export function computeScale(dpi: number): number {
  return dpi / 72
}

/** 校验单页页码在 [1, pageCount] 内 */
function checkPageInRange(n: number, token: string, pageCount: number): void {
  if (n < 1 || n > pageCount) {
    throw new Error(`页码超出范围：${token}（该 PDF 共 ${pageCount} 页）`)
  }
}

/**
 * 解析页码选择：
 * - "all"（不区分大小写）→ 全部页面
 * - "1,3,5-7" → 去重、升序的页码数组
 * 非法抛错：空选择、非数字、页码超范围、范围倒置（如 7-5）
 */
export function parsePageSelection(raw: string, pageCount: number): number[] {
  const t = raw.trim()
  if (t.toLowerCase() === 'all') {
    return Array.from({ length: pageCount }, (_, i) => i + 1)
  }
  if (t === '') throw new Error('页码选择不能为空（"all" 表示全部页面）')
  const selected = new Set<number>()
  for (const fragment of t.split(',')) {
    const token = fragment.trim()
    if (token === '') throw new Error(`页码选择非法：存在空片段（${raw}）`)
    if (token.includes('-')) {
      const segs = token.split('-').map((s) => s.trim())
      if (segs.length !== 2) throw new Error(`页码范围非法：${token}（形如 5-7）`)
      const [startRaw, endRaw] = segs
      if (!/^\d+$/.test(startRaw) || !/^\d+$/.test(endRaw)) {
        throw new Error(`页码无效：${token}（须为正整数或范围如 5-7）`)
      }
      const start = Number(startRaw)
      const end = Number(endRaw)
      if (start > end) throw new Error(`页码范围倒置：${token}（起始页不能大于结束页）`)
      checkPageInRange(start, token, pageCount)
      checkPageInRange(end, token, pageCount)
      for (let n = start; n <= end; n++) selected.add(n)
    } else {
      if (!/^\d+$/.test(token)) throw new Error(`页码无效：${token}（须为正整数或范围如 5-7）`)
      const n = Number(token)
      checkPageInRange(n, token, pageCount)
      selected.add(n)
    }
  }
  return [...selected].sort((a, b) => a - b)
}

/** 校验渲染尺寸不超过 Canvas 像素上限 */
export function assertRenderSizeOk(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('页面尺寸无效')
  }
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new Error(`渲染尺寸过大（${Math.round(width)}×${Math.round(height)}），请降低 DPI`)
  }
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'png' | 'jpeg'): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png'
}

/** 构造单页输出文件名：原名-p{页码}.扩展名（空名兜底为 pdf） */
export function buildPageFileName(base: string, pageNum: number, format: 'png' | 'jpeg'): string {
  const safeBase = base || 'pdf'
  const ext = format === 'jpeg' ? 'jpg' : 'png'
  return `${safeBase}-p${pageNum}.${ext}`
}

/** 是否为 PDF 文件（MIME 为主，扩展名兜底） */
export function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true
  return /\.pdf$/i.test(file.name)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
