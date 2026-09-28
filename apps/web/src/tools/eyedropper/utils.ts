/**
 * eyedropper —— 取色器的纯函数层
 *
 * 约定：EyeDropper API / canvas 只出现在 Tool.tsx，
 * 本文件只做颜色解析 / 格式转换 / 像素采样平均 / 报告，可在 node 下被 vitest 完整测试。
 */

/** RGB 颜色：各通道 0–255 整数 */
export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** HSL 颜色：h 0–360，s / l 0–100 */
export interface Hsl {
  readonly h: number
  readonly s: number
  readonly l: number
}

// ---------------------------------------------------------------------------
// 颜色解析
// ---------------------------------------------------------------------------

/** 单通道校验：0–255 整数 */
function assertChannel(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`颜色分量非法：${name}=${String(value)}（应为 0–255 的整数）`)
  }
}

/** 构造 Rgb（带通道校验） */
export function makeRgb(r: number, g: number, b: number): Rgb {
  assertChannel(r, 'r')
  assertChannel(g, 'g')
  assertChannel(b, 'b')
  return { r, g, b }
}

/**
 * 解析用户输入的颜色：支持 #rgb、#rrggbb（大小写均可，允许省略 #），
 * 以及 rgb(r, g, b) 写法。非法输入抛中文错。
 */
export function parseColorInput(raw: string): Rgb {
  const text = raw.trim()
  if (text === '') throw new Error('颜色不能为空')
  const hexMatch = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(text)
  if (hexMatch) {
    let hex = hexMatch[1]!
    if (hex.length === 3)
      hex = hex
        .split('')
        .map((ch) => ch + ch)
        .join('')
    return makeRgb(
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    )
  }
  const rgbMatch = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(text)
  if (rgbMatch) {
    return makeRgb(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]))
  }
  throw new Error(`颜色格式非法：${raw}（支持 #rgb / #rrggbb / rgb(r,g,b)）`)
}

// ---------------------------------------------------------------------------
// 格式转换
// ---------------------------------------------------------------------------

/** Rgb → #rrggbb（小写） */
export function rgbToHex({ r, g, b }: Rgb): string {
  assertChannel(r, 'r')
  assertChannel(g, 'g')
  assertChannel(b, 'b')
  const pad = (n: number) => n.toString(16).padStart(2, '0')
  return `#${pad(r)}${pad(g)}${pad(b)}`
}

/** Rgb → "rgb(r, g, b)" */
export function rgbToCss({ r, g, b }: Rgb): string {
  assertChannel(r, 'r')
  assertChannel(g, 'g')
  assertChannel(b, 'b')
  return `rgb(${r}, ${g}, ${b})`
}

/** Rgb → Hsl（h 取整 0–360，s / l 取整 0–100） */
export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  assertChannel(r, 'r')
  assertChannel(g, 'g')
  assertChannel(b, 'b')
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      : max === gn
        ? ((bn - rn) / d + 2) / 6
        : ((rn - gn) / d + 4) / 6
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** Hsl → "hsl(h, s%, l%)" */
export function hslToCss({ h, s, l }: Hsl): string {
  if (!Number.isFinite(h) || h < 0 || h > 360) throw new Error(`色相非法：${String(h)}`)
  if (!Number.isFinite(s) || s < 0 || s > 100) throw new Error(`饱和度非法：${String(s)}`)
  if (!Number.isFinite(l) || l < 0 || l > 100) throw new Error(`亮度非法：${String(l)}`)
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
}

// ---------------------------------------------------------------------------
// 像素采样
// ---------------------------------------------------------------------------

/**
 * 在 RGBA 像素缓冲上以 (x, y) 为中心、radius 为半径做方形区域平均，
 * 越界像素自动忽略。坐标 / 半径非法或区域内无有效像素时抛中文错。
 */
export function sampleAverageColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
): Rgb {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`图像尺寸非法：${String(width)}×${String(height)}`)
  }
  if (pixels.length !== width * height * 4) throw new Error('像素数据长度与图像尺寸不匹配')
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error('采样坐标必须是整数')
  if (!Number.isInteger(radius) || radius < 0) throw new Error('采样半径必须是非负整数')
  let r = 0
  let g = 0
  let b = 0
  let count = 0
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const px = x + dx
      const py = y + dy
      if (px < 0 || py < 0 || px >= width || py >= height) continue
      const off = (py * width + px) * 4
      r += pixels[off]!
      g += pixels[off + 1]!
      b += pixels[off + 2]!
      count++
    }
  }
  if (count === 0) throw new Error('采样区域超出图像范围')
  return makeRgb(Math.round(r / count), Math.round(g / count), Math.round(b / count))
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

/** 颜色报告：HEX / RGB / HSL 三行 + 色块提示 */
export function buildColorReport(rgb: Rgb): string {
  const hsl = rgbToHsl(rgb)
  return [`HEX：${rgbToHex(rgb)}`, `RGB：${rgbToCss(rgb)}`, `HSL：${hslToCss(hsl)}`].join('\n')
}
