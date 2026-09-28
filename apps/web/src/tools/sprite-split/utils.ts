/**
 * sprite-split —— 全局编号 #786
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 精灵图（雪碧图）切割：
 * validateSpriteParams 校验行列/边距/间距参数（中文报错）；
 * computeFrames 纯计算每帧 {x, y, w, h}；
 * drawFrame 将绘制逻辑与 DOM 解耦（仅依赖最小 2D 上下文接口），便于测试。
 * 无任何运行时依赖。
 */

export interface SpriteParams {
  /** 原图宽（px） */
  imgW: number
  /** 原图高（px） */
  imgH: number
  /** 列数 */
  cols: number
  /** 行数 */
  rows: number
  /** 外边距（px），默认 0 */
  margin?: number
  /** 帧间距（px），默认 0 */
  spacing?: number
}

export interface SpriteFrame {
  index: number
  x: number
  y: number
  w: number
  h: number
}

/** 与 DOM 解耦的最小 2D 绘图接口 */
export interface SpriteDrawContext<T> {
  drawImage(
    img: T,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

export function validateSpriteParams(p: SpriteParams): void {
  if (!isPositiveInt(p.imgW)) throw new Error('原图宽度 imgW 必须为正整数')
  if (!isPositiveInt(p.imgH)) throw new Error('原图高度 imgH 必须为正整数')
  if (!isPositiveInt(p.cols)) throw new Error('列数 cols 必须为正整数')
  if (!isPositiveInt(p.rows)) throw new Error('行数 rows 必须为正整数')
  const margin = p.margin ?? 0
  const spacing = p.spacing ?? 0
  if (!Number.isInteger(margin) || margin < 0) throw new Error('外边距 margin 必须为非负整数')
  if (!Number.isInteger(spacing) || spacing < 0) throw new Error('帧间距 spacing 必须为非负整数')
  if (margin * 2 >= p.imgW) throw new Error('外边距过大，超出原图宽度')
  if (margin * 2 >= p.imgH) throw new Error('外边距过大，超出原图高度')
  const frameW = (p.imgW - margin * 2 - (p.cols - 1) * spacing) / p.cols
  const frameH = (p.imgH - margin * 2 - (p.rows - 1) * spacing) / p.rows
  if (frameW <= 0 || frameH <= 0) throw new Error('行列与间距组合导致帧尺寸为 0 或负数')
  if (!Number.isInteger(frameW) || !Number.isInteger(frameH)) {
    throw new Error(`原图无法被行列整除（帧尺寸 ${frameW}×${frameH} 非整数），请调整参数`)
  }
}

export function computeFrames(p: SpriteParams): SpriteFrame[] {
  validateSpriteParams(p)
  const margin = p.margin ?? 0
  const spacing = p.spacing ?? 0
  const w = (p.imgW - margin * 2 - (p.cols - 1) * spacing) / p.cols
  const h = (p.imgH - margin * 2 - (p.rows - 1) * spacing) / p.rows
  const frames: SpriteFrame[] = []
  for (let r = 0; r < p.rows; r += 1) {
    for (let c = 0; c < p.cols; c += 1) {
      frames.push({
        index: r * p.cols + c,
        x: margin + c * (w + spacing),
        y: margin + r * (h + spacing),
        w,
        h,
      })
    }
  }
  return frames
}

/** 在给定上下文上绘制单帧（dx/dy 为目标原点，scale 为缩放倍数） */
export function drawFrame<T>(
  ctx: SpriteDrawContext<T>,
  img: T,
  frame: SpriteFrame,
  dx: number,
  dy: number,
  scale = 1,
): void {
  if (scale <= 0) throw new Error('缩放倍数 scale 必须为正数')
  ctx.drawImage(img, frame.x, frame.y, frame.w, frame.h, dx, dy, frame.w * scale, frame.h * scale)
}

export function parseSpriteParams(text: string): SpriteParams {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
    throw new Error('输入必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  const params: SpriteParams = {
    imgW: o.imgW as number,
    imgH: o.imgH as number,
    cols: o.cols as number,
    rows: o.rows as number,
    margin: o.margin as number | undefined,
    spacing: o.spacing as number | undefined,
  }
  validateSpriteParams(params)
  return params
}

export function renderFrames(frames: SpriteFrame[]): string {
  return (
    `共 ${frames.length} 帧：\n` +
    frames.map((f) => `#${f.index}: x=${f.x}, y=${f.y}, w=${f.w}, h=${f.h}`).join('\n')
  )
}
