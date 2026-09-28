/**
 * image-slider 纯函数：滑块百分比计算、clip-path 生成、分隔线定位、文件校验。
 * 不触碰 React/DOM，可 100% 单测。注意：禁止 import '../../lib/image'。
 */

/** 对比方向：horizontal=左右对比，vertical=上下对比 */
export type SliderDirection = 'horizontal' | 'vertical'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 键盘微调步进（百分比） */
export const KEYBOARD_STEP = 2

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 滑块百分比限制到 0–100；NaN/Infinity 视为无效输入直接抛错 */
export function clampPercent(v: number): number {
  if (!Number.isFinite(v)) throw new Error('滑块位置无效')
  return Math.min(100, Math.max(0, v))
}

/**
 * 上层图（图 A/前图）的 CSS clip-path：
 *  - horizontal：显示左侧 p%，`inset(0 ${100-p}% 0 0)`（从右侧裁掉 100-p%）
 *  - vertical：显示上方 p%，`inset(0 0 ${100-p}% 0)`（从下方裁掉 100-p%）
 */
export function clipPathFor(percent: number, direction: SliderDirection): string {
  const p = clampPercent(percent)
  const hidden = 100 - p
  return direction === 'horizontal' ? `inset(0 ${hidden}% 0 0)` : `inset(0 0 ${hidden}% 0)`
}

/** 分隔线定位：horizontal 时按 left 百分比，vertical 时按 top 百分比 */
export function handlePosition(
  percent: number,
  direction: SliderDirection,
): { left: string } | { top: string } {
  const p = clampPercent(percent)
  return direction === 'horizontal' ? { left: `${p}%` } : { top: `${p}%` }
}

/** 键盘步进：percent+delta 后重新 clamp，步进量越界自动钳制 */
export function stepPercent(percent: number, delta: number): number {
  return clampPercent(percent + delta)
}

/**
 * 由指针位置换算滑块百分比。
 * client=指针在主轴上的客户端坐标（horizontal 取 clientX，vertical 取 clientY）；
 * start=轨道起始边客户端坐标；span=轨道主轴长度。
 * 轨道长度为 0（容器尚未布局）时返回 null，调用方直接忽略本次更新。
 */
export function percentFromPointer(client: number, start: number, span: number): number | null {
  if (span <= 0) return null
  return clampPercent(((client - start) / span) * 100)
}

/** 矩形（getBoundingClientRect 结果的最小子集） */
export interface RectLike {
  left: number
  top: number
  width: number
  height: number
}

/** 由指针事件坐标 + 轨道矩形换算滑块百分比；方向决定取横轴还是纵轴 */
export function percentFromClientRect(
  clientX: number,
  clientY: number,
  rect: RectLike,
  direction: SliderDirection,
): number | null {
  const horizontal = direction === 'horizontal'
  return percentFromPointer(
    horizontal ? clientX : clientY,
    horizontal ? rect.left : rect.top,
    horizontal ? rect.width : rect.height,
  )
}

/** 容器宽高比样式：宽高比取图 A（前图），w/h 须为正有限数 */
export function aspectStyle(w: number, h: number): { aspectRatio: string } {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error('图片尺寸无效')
  }
  return { aspectRatio: `${w} / ${h}` }
}
