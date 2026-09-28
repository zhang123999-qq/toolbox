/**
 * color-picker 纯函数：颜色格式转换、输入校验、EyeDropper 环境检测。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** EyeDropper Web API 的最小类型声明（TypeScript lib.dom 尚未收录） */
export interface EyeDropperOpenResult {
  sRGBHex: string
}
export interface EyeDropperInstance {
  open: () => Promise<EyeDropperOpenResult>
}
export interface EyeDropperConstructor {
  new (): EyeDropperInstance
}

declare global {
  interface Window {
    EyeDropper?: EyeDropperConstructor
  }
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** #rgb / #rrggbb（# 可省略，不区分大小写）转 {r,g,b}；非法抛错 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const t = hex.trim().replace(/^#/, '')
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(t)) {
    throw new Error(`颜色值无效：${hex}（须为 #rgb 或 #rrggbb 形式）`)
  }
  const full =
    t.length === 3
      ? t
          .split('')
          .map((c) => c + c)
          .join('')
      : t
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  }
}

/** {r,g,b} 转 #rrggbb；越界钳制到 0–255 并取整 */
export function rgbToHex(r: number, g: number, b: number): string {
  const channel = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/** 标准公式转 HSL；h 取整 0–360，s/l 为百分比取整 */
export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): {
  h: number
  s: number
  l: number
} {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) {
      h = (gn - bn) / d + (gn < bn ? 6 : 0)
    } else if (max === gn) {
      h = (bn - rn) / d + 2
    } else {
      h = (rn - gn) / d + 4
    }
    h /= 6
  }
  return { h: Math.round(h * 360) % 360, s: Math.round(s * 100), l: Math.round(l * 100) }
}

/** 当前环境是否可用 EyeDropper（Chromium 系浏览器提供） */
export function isEyeDropperSupported(): boolean {
  return typeof window !== 'undefined' && 'EyeDropper' in window
}

/** 用户手动输入的色值：去空白、校验、归一化为小写 #rrggbb；非法抛错 */
export function parseHexInput(raw: string): string {
  const t = raw.trim()
  if (t === '') throw new Error('请输入颜色值，例如 #ff0000')
  const { r, g, b } = hexToRgb(t)
  return rgbToHex(r, g, b)
}

/** 是否为用户主动取消取色（EyeDropper 以 AbortError 拒绝） */
export function isAbortError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  if (err instanceof DOMException) return err.name === 'AbortError'
  return 'name' in err && err.name === 'AbortError'
}

/** rgb(255, 0, 0) 文本 */
export function formatRgbText(r: number, g: number, b: number): string {
  return `rgb(${r}, ${g}, ${b})`
}

/** hsl(0, 100%, 50%) 文本 */
export function formatHslText(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`
}
