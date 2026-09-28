/**
 * image-annotate 纯函数：参数解析、箭头几何、像素化、历史栈、文件名、坐标换算。
 * 不触碰 DOM / Canvas / React，可 100% 单测。
 * 注意：不 import '../../lib/image'（分层约束），像素化只操作原始像素数组，
 * ImageData 的构造与读写由调用方（Tool 层）在浏览器环境完成。
 */

export const DEFAULT_LINE_WIDTH = 4
export const DEFAULT_FONT_SIZE = 32
/** 撤销历史上限步数 */
export const HISTORY_LIMIT = 30
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析线宽 1–50；空串用默认 4 */
export function parseLineWidth(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_LINE_WIDTH
  if (!/^\d+$/.test(t)) throw new Error(`线宽无效：${raw}（须为 1–50 的整数）`)
  const w = Number(t)
  if (w < 1 || w > 50) throw new Error(`线宽超出范围：${raw}（须为 1–50 的整数）`)
  return w
}

/** 解析字号 12–120；空串用默认 32 */
export function parseFontSize(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_FONT_SIZE
  if (!/^\d+$/.test(t)) throw new Error(`字号无效：${raw}（须为 12–120 的整数）`)
  const s = Number(t)
  if (s < 12 || s > 120) throw new Error(`字号超出范围：${raw}（须为 12–120 的整数）`)
  return s
}

/** 解析颜色：#rrggbb 或 #rgb（归一化为小写 #rrggbb）；非法抛错 */
export function parseColor(raw: string): string {
  const t = raw.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return t.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(t)) {
    return t.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3').toLowerCase()
  }
  throw new Error(`颜色无效：${raw}（须为 #rrggbb 或 #rgb 格式）`)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 箭头头部两翼端点 */
export interface ArrowHead {
  p1x: number
  p1y: number
  p2x: number
  p2y: number
}

/**
 * 箭头头部几何：tip 为箭头尖端，tail 为箭尾起点；headLen 为翼长，
 * headAngleDeg 为箭杆与每翼的夹角（度，须在 0–90 之间，不含端点）。
 * 返回两翼端点 p1 / p2（调用方从 tip 向两端点连线即成箭头）。
 */
export function getArrowHead(
  tipX: number,
  tipY: number,
  tailX: number,
  tailY: number,
  headLen: number,
  headAngleDeg = 30,
): ArrowHead {
  if (!(headLen > 0)) throw new Error('箭头头部长度须为正数')
  if (!(headAngleDeg > 0 && headAngleDeg < 90)) {
    throw new Error('箭头头部角度须在 0–90 度之间（不含端点）')
  }
  const dx = tipX - tailX
  const dy = tipY - tailY
  const len = Math.hypot(dx, dy)
  if (len === 0) throw new Error('箭头方向无效：起点与终点重合')
  // 指向尖端的单位向量 u，法向量 n = (-uy, ux)；
  // 翼向量 = -(cos a * u ± sin a * n) * headLen
  const ux = dx / len
  const uy = dy / len
  const rad = (headAngleDeg * Math.PI) / 180
  const along = Math.cos(rad) * headLen
  const across = Math.sin(rad) * headLen
  return {
    p1x: tipX - along * ux + across * uy,
    p1y: tipY - along * uy - across * ux,
    p2x: tipX - along * ux - across * uy,
    p2y: tipY - along * uy + across * ux,
  }
}

/**
 * 像素化：把 w×h 的像素数组按 blockSize 分块，每块填充其左上角像素。
 * 返回新数组（不修改入参）。blockSize=1 时等价于复制。
 */
export function pixelateRegion(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  blockSize: number,
): Uint8ClampedArray {
  if (!Number.isInteger(w) || w <= 0) throw new Error('像素化宽度无效：须为正整数')
  if (!Number.isInteger(h) || h <= 0) throw new Error('像素化高度无效：须为正整数')
  if (!Number.isInteger(blockSize) || blockSize <= 0) {
    throw new Error('像素化块大小无效：须为正整数')
  }
  if (src.length !== w * h * 4) throw new Error('像素数据长度与宽高不匹配')
  // 不写显式泛型：用变量类型注解，避免破坏 TypedArray 重载解析
  const out: Uint8ClampedArray = new Uint8ClampedArray(src.length)
  for (let by = 0; by < h; by += blockSize) {
    for (let bx = 0; bx < w; bx += blockSize) {
      const si = (by * w + bx) * 4
      const r = src[si]
      const g = src[si + 1]
      const b = src[si + 2]
      const a = src[si + 3]
      const yEnd = Math.min(by + blockSize, h)
      const xEnd = Math.min(bx + blockSize, w)
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const di = (y * w + x) * 4
          out[di] = r
          out[di + 1] = g
          out[di + 2] = b
          out[di + 3] = a
        }
      }
    }
  }
  return out
}

/**
 * 历史入栈（纯函数）：返回新栈，不修改入参；超限时丢弃最旧的快照。
 */
export function historyPush<T>(stack: T[], snapshot: T, limit: number): T[] {
  const next = [...stack, snapshot]
  return next.length > limit ? next.slice(next.length - limit) : next
}

/** 历史出栈（纯函数）：返回新栈与栈顶；空栈时 top 为 undefined */
export function historyPop<T>(stack: T[]): { stack: T[]; top: T | undefined } {
  if (stack.length === 0) return { stack: [], top: undefined }
  return { stack: stack.slice(0, -1), top: stack.at(-1) }
}

/** 构造输出文件名：原名去扩展名 + '-annotated.png' */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-annotated.png`
}

/**
 * 鼠标坐标换算为 canvas 像素坐标。
 * 本工具画布按原尺寸 1:1 显示，scale 默认为 1；保留 scale 参数便于单测与复用。
 */
export function mouseToCanvas(
  clientX: number,
  clientY: number,
  rectLeft: number,
  rectTop: number,
  scaleX = 1,
  scaleY = 1,
): { x: number; y: number } {
  return {
    x: (clientX - rectLeft) * scaleX,
    y: (clientY - rectTop) * scaleY,
  }
}
