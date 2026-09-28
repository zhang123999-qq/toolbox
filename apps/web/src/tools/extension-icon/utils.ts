/**
 * extension-icon —— 全局编号 #774
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 扩展图标绘制：在离屏 canvas 上绘制圆角矩形/圆形底 + 字母，导出 PNG dataURL。
 * 绘制逻辑只依赖注入的 2D 上下文接口，测试用 mock 断言调用序列，不依赖真实 canvas。
 */

export type IconShape = 'rounded-square' | 'circle'

export interface IconParams {
  size: number
  bg: string
  fg: string
  letter: string
  shape: IconShape
}

export const ICON_SIZES: readonly number[] = [16, 48, 128]
export const ICON_SHAPES: readonly IconShape[] = ['rounded-square', 'circle']

export const SHAPE_LABELS: Record<IconShape, string> = {
  'rounded-square': '圆角矩形',
  circle: '圆形',
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/

export function validateIconParams(p: IconParams): void {
  if (!p || typeof p !== 'object') {
    throw new Error('图标参数必须是对象')
  }
  if (!Number.isInteger(p.size) || p.size <= 0) {
    throw new Error('size 必须是正整数')
  }
  if (typeof p.bg !== 'string' || !HEX_COLOR_RE.test(p.bg)) {
    throw new Error('bg 必须是 #rrggbb 格式颜色')
  }
  if (typeof p.fg !== 'string' || !HEX_COLOR_RE.test(p.fg)) {
    throw new Error('fg 必须是 #rrggbb 格式颜色')
  }
  if (typeof p.letter !== 'string' || p.letter.length === 0 || p.letter.length > 2) {
    throw new Error('letter 需为 1～2 个字符')
  }
  if (!ICON_SHAPES.includes(p.shape)) {
    throw new Error(`shape 非法：${String(p.shape)}（可选 ${ICON_SHAPES.join(' / ')}）`)
  }
}

/** 纯数据绘制规格（与 canvas 解耦，可直接单测）。 */
export interface IconDrawSpec {
  size: number
  bg: string
  fg: string
  letter: string
  shape: IconShape
  fontPx: number
  cornerRadius: number
}

export function buildIconSpec(p: IconParams): IconDrawSpec {
  validateIconParams(p)
  return {
    size: p.size,
    bg: p.bg,
    fg: p.fg,
    letter: p.letter,
    shape: p.shape,
    fontPx: Math.max(8, Math.round(p.size * 0.55)),
    cornerRadius: Math.round(p.size * 0.22),
  }
}

/** 绘制所需的最小 2D 上下文接口（真实 CanvasRenderingContext2D 的子集）。 */
export interface IconCtx2D {
  fillStyle: string
  font: string
  textAlign: string
  textBaseline: string
  fillRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void
  closePath(): void
  arc(x: number, y: number, r: number, start: number, end: number): void
  fill(): void
  fillText(text: string, x: number, y: number): void
}

/** 在给定 2D 上下文上按规格绘制图标（不触碰 DOM，可单测）。 */
export function drawIconOnContext(spec: IconDrawSpec, ctx: IconCtx2D): void {
  const { size, bg, fg, letter, shape, fontPx, cornerRadius } = spec
  ctx.fillStyle = bg
  if (shape === 'circle') {
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    const r = Math.min(cornerRadius, size / 2)
    ctx.beginPath()
    ctx.moveTo(r, 0)
    ctx.lineTo(size - r, 0)
    ctx.quadraticCurveTo(size, 0, size, r)
    ctx.lineTo(size, size - r)
    ctx.quadraticCurveTo(size, size, size - r, size)
    ctx.lineTo(r, size)
    ctx.quadraticCurveTo(0, size, 0, size - r)
    ctx.lineTo(0, r)
    ctx.quadraticCurveTo(0, 0, r, 0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.fillStyle = fg
  ctx.font = `bold ${fontPx}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(letter, size / 2, size / 2 + fontPx * 0.05)
}

export interface IconCanvas {
  getContext(kind: '2d'): IconCtx2D | null
  toDataURL(type?: string): string
}

/**
 * 绘制图标并导出 PNG dataURL。
 * createCanvas 由调用方注入（浏览器用 document.createElement('canvas')），
 * 测试注入 mock，绝不触碰真实 canvas。
 */
export function renderIconDataUrl(
  params: IconParams,
  createCanvas: (size: number) => IconCanvas | null | undefined,
): string {
  const spec = buildIconSpec(params)
  const canvas = createCanvas(spec.size)
  if (!canvas) {
    throw new Error('无法创建 canvas')
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法获取 2d 绘图上下文')
  }
  drawIconOnContext(spec, ctx)
  return canvas.toDataURL('image/png')
}

export type ParsedIconInput = IconParams

/** 解析页面输入的 JSON 参数（非法抛中文错）。 */
export function parseIconInput(text: string): ParsedIconInput {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('输入必须是 JSON 对象')
  }
  const o = raw as Record<string, unknown>
  const parsed: ParsedIconInput = {
    size: typeof o.size === 'number' ? o.size : 48,
    bg: typeof o.bg === 'string' ? o.bg : '#2563eb',
    fg: typeof o.fg === 'string' ? o.fg : '#ffffff',
    letter: typeof o.letter === 'string' ? o.letter : 'T',
    shape: o.shape === 'circle' ? 'circle' : 'rounded-square',
  }
  validateIconParams(parsed)
  return parsed
}

export const EXAMPLE_ICON: ParsedIconInput = {
  size: 48,
  bg: '#2563eb',
  fg: '#ffffff',
  letter: 'T',
  shape: 'rounded-square',
}
