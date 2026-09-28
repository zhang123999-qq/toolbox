/**
 * svg-to-png 纯函数：SVG 尺寸解析、目标尺寸计算、背景色解析、文件名构造、文件校验。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 单文件上限 50MB（与本批其他工具统一） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 输出边长上限（Canvas 安全边界） */
export const MAX_DIMENSION = 16384
/** 自然尺寸未知且未指定尺寸时的默认边长 */
export const DEFAULT_SIZE = 512

/** 背景模式 */
export type BackgroundMode = 'transparent' | 'white' | 'custom'

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** SVG 文件判定：MIME 为 image/svg+xml，或文件名为 .svg 后缀 */
export function isSvgFile(file: File): boolean {
  if (file.type === 'image/svg+xml') return true
  return /\.svg$/i.test(file.name)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** 校验 SVG 文本：非空且包含 <svg> 标签，返回去空白后的文本 */
export function assertSvgText(text: string): string {
  const trimmed = text.trim()
  if (trimmed === '') throw new Error('SVG 文本为空：文件内容为空')
  if (!/<svg[\s>/]/i.test(trimmed)) throw new Error('不是有效的 SVG：未找到 <svg> 标签')
  return trimmed
}

/** 取 <svg> 标签上某属性的原始值（双/单引号皆可）；属性名前须为空白，避免误匹配 stroke-width 这类 */
function attrValue(svgText: string, name: string): string | null {
  const m = new RegExp(`<svg[^>]*?\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(svgText)
  if (!m) return null
  return m[1] ?? m[2]
}

/** 解析长度：只接受纯数字或 px 后缀（如 "100" / "100px"）；须 > 0，否则 null */
function parseLength(raw: string | null): number | null {
  if (raw === null) return null
  const m = /^\s*([0-9]*\.?[0-9]+)\s*(px)?\s*$/i.exec(raw)
  if (!m) return null
  const v = Number(m[1])
  return v > 0 ? v : null
}

/**
 * 解析 SVG 自然尺寸：
 * 优先 <svg> 的 width/height（只接受纯数字或 px；百分比、pt 等单位拒绝），
 * 两者缺一则退化到 viewBox 的后两个数（宽 高）；都解析不出返回 null。
 */
export function parseSvgDimensions(svgText: string): { width: number; height: number } | null {
  const w = parseLength(attrValue(svgText, 'width'))
  const h = parseLength(attrValue(svgText, 'height'))
  if (w !== null && h !== null) return { width: w, height: h }
  const vb = attrValue(svgText, 'viewBox')
  if (vb !== null) {
    const parts = vb.trim().split(/[\s,]+/)
    if (parts.length === 4) {
      const vw = Number(parts[2])
      const vh = Number(parts[3])
      if (vw > 0 && vh > 0) return { width: vw, height: vh }
    }
  }
  return null
}

/** 解析用户输入的尺寸：空串=未指定；须为 1–MAX_DIMENSION 的整数 */
function parseSizeInput(raw: string, label: string): number | null {
  const t = raw.trim()
  if (t === '') return null
  if (!/^\d+$/.test(t)) throw new Error(`${label}无效：${raw}（须为正整数，空=自然尺寸）`)
  const v = Number(t)
  if (v < 1 || v > MAX_DIMENSION) {
    throw new Error(`${label}超出范围：${raw}（须为 1–${MAX_DIMENSION} 的整数）`)
  }
  return v
}

/**
 * 计算输出尺寸：
 * - 宽高都给：直接用；
 * - 只给一边：按自然宽高比缩放另一边（自然尺寸未知时取正方形）；
 * - 都不给：自然尺寸（未知时默认 512×512）。
 */
export function computeTargetSize(
  natural: { width: number; height: number } | null,
  widthOpt: string,
  heightOpt: string,
): { width: number; height: number } {
  const w = parseSizeInput(widthOpt, '宽度')
  const h = parseSizeInput(heightOpt, '高度')
  if (w !== null && h !== null) return { width: w, height: h }
  const nw = natural && natural.width > 0 ? natural.width : 0
  const nh = natural && natural.height > 0 ? natural.height : 0
  const known = nw > 0 && nh > 0
  if (w !== null) {
    return { width: w, height: known ? Math.max(1, Math.round((w * nh) / nw)) : w }
  }
  if (h !== null) {
    return { width: known ? Math.max(1, Math.round((h * nw) / nh)) : h, height: h }
  }
  if (known) return { width: nw, height: nh }
  return { width: DEFAULT_SIZE, height: DEFAULT_SIZE }
}

/**
 * 背景色解析：返回可直接赋给 ctx.fillStyle 的色值；
 * null 表示透明（调用方不填充）。
 * 自定义色只接受 #rgb / #rrggbb。
 */
export function parseBackgroundColor(mode: BackgroundMode, custom: string): string | null {
  if (mode === 'transparent') return null
  if (mode === 'white') return '#ffffff'
  const c = custom.trim()
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(c)) {
    throw new Error(`颜色无效：${custom}（须为 #rgb 或 #rrggbb 格式）`)
  }
  return c
}

/** 构造输出文件名：去 .svg 后缀，加 .png；空名兜底为 image */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.svg$/i, '') || 'image'
  return `${base}.png`
}
