/**
 * image-to-ascii 纯函数：参数解析、字符映射、采样尺寸、文本/HTML 输出构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_CHAR_WIDTH = 80
export const MIN_CHAR_WIDTH = 10
export const MAX_CHAR_WIDTH = 200
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/**
 * 字符纵横比：等宽字体中字符高度约为宽度的 2 倍。
 * 为保持画面比例不变，每行字符对应的像素高度 = 像素宽度 × 2，
 * 因此采样行数 = 列数 × (srcH / srcW) / 2。
 */
export const CHAR_ASPECT_RATIO = 2

/** 字符集渐变：从最暗到最亮排列 */
export const CHAR_RAMPS = {
  /** 标准 10 级 */
  standard: '@%#*+=-:. ',
  /** 简单 4 级 */
  simple: '#*. ',
  /** 方块 5 级 */
  blocks: '█▓▒░ ',
} as const

export type CharsetId = keyof typeof CHAR_RAMPS

/** ASCII 画的一个字符单元：字符 + 原像素颜色（彩色模式用） */
export interface AsciiCell {
  char: string
  r: number
  g: number
  b: number
}

/** ASCII 画：行优先的字符矩阵 */
export interface AsciiArt {
  cols: number
  rows: number
  cells: AsciiCell[]
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析字符宽度 10–200；空串用默认 80 */
export function parseCharWidth(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_CHAR_WIDTH
  if (!/^\d+$/.test(t)) throw new Error(`宽度无效：${raw}（须为 10–200 的整数）`)
  const w = Number(t)
  if (w < MIN_CHAR_WIDTH || w > MAX_CHAR_WIDTH) {
    throw new Error(`宽度超出范围：${raw}（须为 10–200 的整数）`)
  }
  return w
}

/** 构造字符渐变：标准渐变为暗→亮；反色时反转 */
export function buildRamp(charset: CharsetId, invert: boolean): string {
  const base = CHAR_RAMPS[charset]
  return invert ? [...base].reverse().join('') : base
}

/** 相对亮度（Rec.601 系数），返回 0–255 */
export function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/** 灰度 0–255 映射为渐变中的字符（0 最暗 → 渐变首字符） */
export function grayToChar(gray: number, ramp: string): string {
  if (ramp.length === 0) throw new Error('字符集为空')
  const g = Math.min(255, Math.max(0, gray))
  const idx = Math.min(ramp.length - 1, Math.floor((g / 255) * ramp.length))
  return ramp[idx]
}

/**
 * 下采样目标像素尺寸：宽 = 字符列数（每列 1 像素），
 * 高 = 按字符高宽比 2:1 补偿后的行数（每行 1 像素），至少 1 行。
 */
export function computeSampleDimensions(
  srcW: number,
  srcH: number,
  cols: number,
): { width: number; height: number } {
  if (!Number.isFinite(srcW) || !Number.isFinite(srcH) || srcW <= 0 || srcH <= 0) {
    throw new Error('图片尺寸无效')
  }
  const rows = Math.max(1, Math.round(((srcH / srcW) * cols) / CHAR_ASPECT_RATIO))
  return { width: cols, height: rows }
}

/**
 * 像素数据转 ASCII 字符矩阵。
 * @param pixels 行优先 RGBA 像素数组（长度须 ≥ width*height*4），宽高为已补偿的采样尺寸
 * @param ramp 字符渐变（暗→亮）
 */
export function imageDataToAscii(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  ramp: string,
): AsciiArt {
  if (width <= 0 || height <= 0) throw new Error('采样尺寸无效')
  if (pixels.length < width * height * 4) throw new Error('像素数据长度不足')
  const cells: AsciiCell[] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      cells.push({ char: grayToChar(luminance(r, g, b), ramp), r, g, b })
    }
  }
  return { cols: width, rows: height, cells }
}

/** 字符矩阵转纯文本：每行拼接，行间换行 */
export function buildTextOutput(art: AsciiArt): string {
  const lines: string[] = []
  for (let y = 0; y < art.rows; y++) {
    let line = ''
    for (let x = 0; x < art.cols; x++) {
      line += art.cells[y * art.cols + x].char
    }
    lines.push(line)
  }
  return lines.join('\n')
}

/** HTML 转义（& 必须最先转义） */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 字符矩阵转彩色 HTML 文档：每个字符用原像素颜色着色，字符与标题均做 HTML 转义 */
export function buildHtmlOutput(art: AsciiArt, title: string): string {
  const lines: string[] = []
  for (let y = 0; y < art.rows; y++) {
    let line = ''
    for (let x = 0; x < art.cols; x++) {
      const c = art.cells[y * art.cols + x]
      line += `<span style="color:rgb(${c.r},${c.g},${c.b})">${escapeHtml(c.char)}</span>`
    }
    lines.push(line)
  }
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '<meta charset="utf-8">\n' +
    `<title>${escapeHtml(title)}</title>\n` +
    '<style>body{background:#0b0b0c;color:#fff;margin:0;padding:16px}' +
    'pre{font-family:ui-monospace,monospace;line-height:1;letter-spacing:0}</style>\n' +
    '</head>\n' +
    '<body>\n' +
    `<pre>${lines.join('\n')}</pre>\n` +
    '</body>\n' +
    '</html>\n'
  )
}

/** 构造输出文件名：原名去扩展名 + -ascii + 目标扩展名 */
export function buildOutputFileName(originalName: string, ext: 'txt' | 'html'): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-ascii.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}
