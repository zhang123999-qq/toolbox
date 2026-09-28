/**
 * pdf-compare 纯函数：文件校验（魔数/大小）、阈值解析、渲染尺寸校验、
 * 页面对齐、像素级差异计算、差异占比文本、差异报告生成。
 * 不触碰 React/DOM，不 import 其他工具；pdfjs-dist 只在 Tool.tsx 中使用。
 *
 * 差异语义（与 README「边界」节一致）：
 *  • 只比较 RGB 三通道，alpha 通道忽略；
 *  • 任一通道差值 > threshold 即判定为差异像素（== threshold 不算）；
 *  • 两页尺寸不同时，对齐到外接矩形（宽/高各取最大），较小页居中、
 *    白底补齐，超出较小页范围的像素视为差异，并标记 sizeMismatch。
 */

/** 从 Canvas getImageData 得到的像素数据（宽高必须与 data 长度一致） */
export interface PixelData {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** 单页比对结果摘要（位图本身不保留，由调用方按需重渲染，控制内存） */
export interface PageStat {
  page: number
  diffPixels: number
  totalPixels: number
  sizeMismatch: boolean
}

/** 单页差异计算的完整结果（含差异层位图，供叠加视图绘制） */
export interface PageDiff extends PageStat {
  width: number
  height: number
  /** 与对齐画布同尺寸的差异层：差异像素为 DIFF_MARK，其余全透明 */
  diffData: Uint8ClampedArray
}

/** 差异像素在差异层上的标记：红色半透明 */
export const DIFF_MARK: readonly [number, number, number, number] = [255, 0, 0, 128]

/** 默认差异阈值 */
export const DEFAULT_THRESHOLD = 30
/** 阈值上限 */
export const MAX_THRESHOLD = 255
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 页面渲染缩放倍数：1.2（精度/内存权衡见 README「边界」节） */
export const RENDER_SCALE = 1.2
/** Canvas 单边像素上限（主流浏览器的安全边界） */
export const MAX_CANVAS_DIMENSION = 16384
/** Canvas 总像素上限 */
export const MAX_CANVAS_PIXELS = MAX_CANVAS_DIMENSION * MAX_CANVAS_DIMENSION

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为 PDF。
 */
export function isPdfFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 是否为 pdfjs 抛出的加密 PDF 错误。
 * pdfjs 的异常类在构造时设置 this.name（跨 realm 也稳定），
 * 按 name 识别比 instanceof 更可靠。
 */
export function isPasswordPdfError(err: unknown): boolean {
  return err instanceof Error && err.name === 'PasswordException'
}

/** 解析差异阈值 0–255 的整数；空串用默认 30 */
export function parseThreshold(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_THRESHOLD
  if (!/^\d+$/.test(t)) throw new Error(`阈值无效：${raw}（须为 0–255 的整数）`)
  const v = Number(t)
  // ^\d+$ 已保证非负整数，只需卡上界
  if (v > MAX_THRESHOLD) throw new Error(`阈值超出范围：${raw}（须为 0–255 的整数）`)
  return v
}

/** 校验渲染尺寸不超过 Canvas 像素上限 */
export function assertRenderSizeOk(width: number, height: number): void {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('页面尺寸无效')
  }
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new Error(
      `渲染尺寸过大（${Math.round(width)}×${Math.round(height)}），超出浏览器 Canvas 上限`,
    )
  }
}

/** 校验像素数据的宽高与 data 长度一致 */
function assertPixelDataOk(p: PixelData, label: string): void {
  if (!Number.isInteger(p.width) || !Number.isInteger(p.height) || p.width <= 0 || p.height <= 0) {
    throw new Error(`${label}页面尺寸无效`)
  }
  if (p.data.length !== p.width * p.height * 4) {
    throw new Error(`${label}像素数据长度与尺寸不一致`)
  }
}

/**
 * 计算两页对齐后的画布尺寸：取外接矩形（宽/高各取最大，向上取整）。
 * 任一输入非法时抛错。
 */
export function computeAlignedSize(
  aW: number,
  aH: number,
  bW: number,
  bH: number,
): { width: number; height: number } {
  if (
    !Number.isFinite(aW) ||
    !Number.isFinite(aH) ||
    !Number.isFinite(bW) ||
    !Number.isFinite(bH) ||
    aW <= 0 ||
    aH <= 0 ||
    bW <= 0 ||
    bH <= 0
  ) {
    throw new Error('页面尺寸无效')
  }
  return { width: Math.ceil(Math.max(aW, bW)), height: Math.ceil(Math.max(aH, bH)) }
}

/**
 * 把页面像素贴到目标画布上：居中，白底（255,255,255,255）补齐。
 * 目标画布不得小于源页面。
 */
export function padToCanvas(p: PixelData, width: number, height: number): PixelData {
  assertPixelDataOk(p, '')
  if (width < p.width || height < p.height) {
    throw new Error('目标画布小于源页面')
  }
  const data = new Uint8ClampedArray(width * height * 4)
  // 白底：PDF 页面默认底色，补齐区域与真实渲染一致
  data.fill(255)
  const ox = Math.floor((width - p.width) / 2)
  const oy = Math.floor((height - p.height) / 2)
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      const s = (y * p.width + x) * 4
      const d = ((oy + y) * width + (ox + x)) * 4
      data[d] = p.data[s]
      data[d + 1] = p.data[s + 1]
      data[d + 2] = p.data[s + 2]
      data[d + 3] = p.data[s + 3]
    }
  }
  return { data, width, height }
}

/**
 * 单页差异计算：两页先对齐到外接矩形再逐像素比较 RGB 差值。
 * 像素数据非法时抛错。
 */
export function computePageDiff(
  page: number,
  a: PixelData,
  b: PixelData,
  threshold: number,
): PageDiff {
  assertPixelDataOk(a, 'A ')
  assertPixelDataOk(b, 'B ')
  const { width, height } = computeAlignedSize(a.width, a.height, b.width, b.height)
  const pa = padToCanvas(a, width, height)
  const pb = padToCanvas(b, width, height)
  const totalPixels = width * height
  const out = new Uint8ClampedArray(totalPixels * 4)
  let diffPixels = 0
  for (let i = 0; i < totalPixels; i++) {
    const o = i * 4
    const dr = Math.abs(pa.data[o] - pb.data[o])
    const dg = Math.abs(pa.data[o + 1] - pb.data[o + 1])
    const db = Math.abs(pa.data[o + 2] - pb.data[o + 2])
    // alpha（o+3）不参与比较
    if (dr > threshold || dg > threshold || db > threshold) {
      out[o] = DIFF_MARK[0]
      out[o + 1] = DIFF_MARK[1]
      out[o + 2] = DIFF_MARK[2]
      out[o + 3] = DIFF_MARK[3]
      diffPixels++
    } else {
      // out 初始化即全 0，只需显式写 alpha 保持语义清晰
      out[o + 3] = 0
    }
  }
  return {
    page,
    diffPixels,
    totalPixels,
    width,
    height,
    sizeMismatch: a.width !== b.width || a.height !== b.height,
    diffData: out,
  }
}

/** 差异占比文本：保留 1 位小数；总数非法时返回占位符 */
export function diffRatioText(diffPixels: number, totalPixels: number): string {
  if (totalPixels <= 0) return '—'
  const ratio = (diffPixels / totalPixels) * 100
  return `${ratio.toFixed(1)}%`
}

/** 超出比对范围的页码列表：compared+1 … total（total <= compared 时为空数组） */
export function extraPageNumbers(compared: number, total: number): number[] {
  const out: number[] = []
  for (let n = compared + 1; n <= total; n++) out.push(n)
  return out
}

/** 差异报告文件名：a-vs-b-diff.txt（空名兜底为 pdf） */
export function buildReportFileName(nameA: string, nameB: string): string {
  const baseA = nameA.replace(/\.[a-z0-9]+$/i, '') || 'pdf'
  const baseB = nameB.replace(/\.[a-z0-9]+$/i, '') || 'pdf'
  return `${baseA}-vs-${baseB}-diff.txt`
}

export interface DiffReportInput {
  nameA: string
  nameB: string
  pagesA: number
  pagesB: number
  compared: number
  threshold: number
  stats: PageStat[]
}

/** 生成纯文本差异报告（可下载）：逐页差异统计 + 多出页列表 */
export function buildDiffReport(input: DiffReportInput): string {
  const { nameA, nameB, pagesA, pagesB, compared, threshold, stats } = input
  const lines = [
    'PDF 对比报告',
    `文件 A：${nameA}（${pagesA} 页）`,
    `文件 B：${nameB}（${pagesB} 页）`,
    `对比页数：${compared}（第 1–${compared} 页），差异阈值：${threshold}`,
    '',
  ]
  for (const s of stats) {
    const mark = s.sizeMismatch ? '（两页尺寸不同）' : ''
    lines.push(
      `第 ${s.page} 页：差异 ${s.diffPixels} / ${s.totalPixels}（${diffRatioText(s.diffPixels, s.totalPixels)}）${mark}`,
    )
  }
  const extraA = extraPageNumbers(compared, pagesA)
  const extraB = extraPageNumbers(compared, pagesB)
  if (extraA.length > 0) lines.push(`文件 A 多出的页：${extraA.join('、')}`)
  if (extraB.length > 0) lines.push(`文件 B 多出的页：${extraB.join('、')}`)
  if (stats.every((s) => s.diffPixels === 0)) lines.push('所对比的页面完全一致，无差异。')
  return lines.join('\n')
}
