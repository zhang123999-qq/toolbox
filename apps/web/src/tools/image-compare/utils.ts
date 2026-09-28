/**
 * image-compare 纯函数：像素数据结构、阈值解析、差异计算、统计文本。
 * 不触碰 React/DOM/Canvas，可 100% 单测。
 *
 * 差异语义（与 README「边界」节一致）：
 *  • 只比较 RGB 三通道，alpha 通道忽略；
 *  • 任一通道差值 > threshold 即判定为差异像素（== threshold 不算）。
 */

/** 从 Canvas getImageData 得到的像素数据（宽高必须与 data 长度一致） */
export interface PixelData {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** 差异像素在差异层上的标记：红色半透明 */
export const DIFF_MARK: readonly [number, number, number, number] = [255, 0, 0, 128]

/** 默认差异阈值 */
export const DEFAULT_THRESHOLD = 30
/** 阈值上限 */
export const MAX_THRESHOLD = 255
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
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

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

export interface DiffResult {
  diffPixels: number
  totalPixels: number
  /** 与输入同尺寸的差异层：差异像素为 DIFF_MARK，其余全透明 */
  diffData: Uint8ClampedArray
}

/**
 * 逐像素比较两张图的 RGB 差值。a/b 必须同宽高（调用方负责先把图 B
 * 缩放到图 A 尺寸）；空图（宽/高 <= 0）抛错。
 */
export function computeDiff(a: PixelData, b: PixelData, threshold: number): DiffResult {
  if (a.width <= 0 || a.height <= 0 || b.width <= 0 || b.height <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error('两张图片尺寸不一致')
  }
  const totalPixels = a.width * a.height
  const out: Uint8ClampedArray = new Uint8ClampedArray(totalPixels * 4)
  let diffPixels = 0
  for (let i = 0; i < totalPixels; i++) {
    const o = i * 4
    const dr = Math.abs(a.data[o] - b.data[o])
    const dg = Math.abs(a.data[o + 1] - b.data[o + 1])
    const db = Math.abs(a.data[o + 2] - b.data[o + 2])
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
  return { diffPixels, totalPixels, diffData: out }
}

/** 差异占比文本：保留 1 位小数；总数非法时返回占位符 */
export function diffRatioText(diffPixels: number, totalPixels: number): string {
  if (totalPixels <= 0) return '—'
  const ratio = (diffPixels / totalPixels) * 100
  return `${ratio.toFixed(1)}%`
}
