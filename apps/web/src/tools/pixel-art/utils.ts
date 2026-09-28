/**
 * pixel-art —— 全局编号 #789
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 像素画：
 * createCanvas 创建画布；validateCanvas 校验（中文报错）；
 * setPixel 返回新画布（不可变）；applyStroke 用 Bresenham 画线段；
 * fill 洪水填充（迭代实现防栈溢出）；mirrorH / mirrorV 镜像；
 * exportPngData 通过可注入的画布工厂导出 PNG dataURL，测试全 mock；
 * PALETTE 内置调色板预设。
 * 撤销栈只在组件层维护。
 * 无任何运行时依赖。
 */

export interface PixelCanvas {
  /** 边长（正方形画布，px） */
  size: number
  /** pixels[y * size + x] = 颜色 hex */
  pixels: string[]
}

/** 与 DOM 解耦的最小 2D 上下文接口（仅导出 PNG 需要） */
export interface PixelDrawContext {
  fillStyle: string
  fillRect(x: number, y: number, w: number, h: number): void
}

export interface CanvasFactory {
  create(w: number, h: number): { ctx: PixelDrawContext; toDataURL(): string }
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** 内置调色板预设 */
export const PALETTE: string[] = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00',
  '#ff00ff', '#00ffff', '#ffa500', '#a52a2a', '#808080', '#ffc0cb',
]

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

function isHexColor(s: unknown): s is string {
  return typeof s === 'string' && HEX_RE.test(s)
}

export function validateCanvas(c: PixelCanvas): void {
  if (typeof c !== 'object' || c === null) throw new Error('画布必须是对象')
  if (!isPositiveInt(c.size)) throw new Error('画布尺寸 size 必须为正整数')
  if (!Array.isArray(c.pixels) || c.pixels.length !== c.size * c.size) {
    throw new Error(`像素数组长度应为 ${c.size * c.size}`)
  }
  for (const p of c.pixels) {
    if (!isHexColor(p)) throw new Error(`非法颜色值：${String(p)}（应为 #rrggbb）`)
  }
}

export function createCanvas(size: number, bg = '#ffffff'): PixelCanvas {
  if (!isPositiveInt(size)) throw new Error('画布尺寸 size 必须为正整数')
  if (size > 256) throw new Error('画布尺寸过大（上限 256）')
  if (!isHexColor(bg)) throw new Error('背景色必须为 #rrggbb 格式')
  return { size, pixels: new Array<string>(size * size).fill(bg) }
}

function checkXY(c: PixelCanvas, x: number, y: number): void {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= c.size || y >= c.size) {
    throw new Error(`坐标 (${x},${y}) 越界（0-${c.size - 1}）`)
  }
}

export function getPixel(c: PixelCanvas, x: number, y: number): string {
  validateCanvas(c)
  checkXY(c, x, y)
  return c.pixels[y * c.size + x]
}

/** 设置单个像素（返回新画布） */
export function setPixel(c: PixelCanvas, x: number, y: number, color: string): PixelCanvas {
  validateCanvas(c)
  checkXY(c, x, y)
  if (!isHexColor(color)) throw new Error('颜色必须为 #rrggbb 格式')
  const pixels = [...c.pixels]
  pixels[y * c.size + x] = color
  return { ...c, pixels }
}

/** Bresenham 直线描边（返回新画布，越界点自动跳过） */
export function applyStroke(
  c: PixelCanvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
): PixelCanvas {
  validateCanvas(c)
  if (!isHexColor(color)) throw new Error('颜色必须为 #rrggbb 格式')
  const pixels = [...c.pixels]
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    if (x >= 0 && y >= 0 && x < c.size && y < c.size) pixels[y * c.size + x] = color
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return { ...c, pixels }
}

/** 洪水填充（迭代实现，返回新画布） */
export function fill(c: PixelCanvas, x: number, y: number, color: string): PixelCanvas {
  validateCanvas(c)
  checkXY(c, x, y)
  if (!isHexColor(color)) throw new Error('颜色必须为 #rrggbb 格式')
  const target = c.pixels[y * c.size + x]
  if (target === color) return c
  const pixels = [...c.pixels]
  const stack: Array<[number, number]> = [[x, y]]
  while (stack.length > 0) {
    const [cx, cy] = stack.pop() as [number, number]
    if (cx < 0 || cy < 0 || cx >= c.size || cy >= c.size) continue
    if (pixels[cy * c.size + cx] !== target) continue
    pixels[cy * c.size + cx] = color
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
  return { ...c, pixels }
}

/** 水平镜像（返回新画布） */
export function mirrorH(c: PixelCanvas): PixelCanvas {
  validateCanvas(c)
  const pixels = new Array<string>(c.size * c.size)
  for (let y = 0; y < c.size; y += 1) {
    for (let x = 0; x < c.size; x += 1) {
      pixels[y * c.size + x] = c.pixels[y * c.size + (c.size - 1 - x)]
    }
  }
  return { ...c, pixels }
}

/** 垂直镜像（返回新画布） */
export function mirrorV(c: PixelCanvas): PixelCanvas {
  validateCanvas(c)
  const pixels = new Array<string>(c.size * c.size)
  for (let y = 0; y < c.size; y += 1) {
    for (let x = 0; x < c.size; x += 1) {
      pixels[(c.size - 1 - y) * c.size + x] = c.pixels[y * c.size + x]
    }
  }
  return { ...c, pixels }
}

/** 统计使用的颜色种类 */
export function usedColors(c: PixelCanvas): string[] {
  validateCanvas(c)
  return [...new Set(c.pixels)]
}

/**
 * 导出 PNG dataURL。
 * factory 可注入：测试传入 mock，组件传入真实 document.createElement('canvas')。
 */
export function exportPngData(c: PixelCanvas, factory: CanvasFactory, scale = 1): string {
  validateCanvas(c)
  if (!isPositiveInt(scale)) throw new Error('缩放倍数 scale 必须为正整数')
  const { ctx, toDataURL } = factory.create(c.size * scale, c.size * scale)
  for (let y = 0; y < c.size; y += 1) {
    for (let x = 0; x < c.size; x += 1) {
      ctx.fillStyle = c.pixels[y * c.size + x]
      ctx.fillRect(x * scale, y * scale, scale, scale)
    }
  }
  return toDataURL()
}

export function canvasToAscii(c: PixelCanvas): string {
  validateCanvas(c)
  return Array.from({ length: c.size }, (_, y) =>
    Array.from({ length: c.size }, (_, x) => (c.pixels[y * c.size + x] === '#ffffff' ? '·' : '█')).join(
      '',
    ),
  ).join('\n')
}
