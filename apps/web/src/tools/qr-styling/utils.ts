import QRCode from 'qrcode'
import type { QrStylingInput, QrStylingOptions } from './schema'

export type DotStyle = 'square' | 'dot' | 'rounded'
const DOT_STYLES: readonly DotStyle[] = ['square', 'dot', 'rounded']
const HEX_RE = /^#[0-9a-fA-F]{6}$/

export interface QrMatrix {
  readonly size: number
  readonly data: Uint8Array
}

/** 取二维码矩阵（固定容错 M），纯函数 */
export function matrixOf(text: string): QrMatrix {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  return { size: qr.modules.size, data: qr.modules.data as Uint8Array }
}

export function parseDotStyle(raw: string): DotStyle {
  const v = (raw || 'square') as DotStyle
  if (!DOT_STYLES.includes(v)) throw new Error('点样式无效，仅支持 square / dot / rounded')
  return v
}

export function parseColor(raw: string, fallback: string): string {
  const v = (raw || fallback).trim()
  if (!HEX_RE.test(v)) throw new Error('颜色无效，须为 #rrggbb 十六进制')
  return v.toLowerCase()
}

export function parseMargin(raw: string): number {
  const n = Number((raw || '4').trim())
  if (!Number.isInteger(n) || n < 0 || n > 10) {
    throw new Error('静默区无效，须为 0–10 的整数（模块数）')
  }
  return n
}

/** 判断模块是否属于三个定位角区域（7×7） */
export function inFinder(x: number, y: number, size: number): boolean {
  return (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7)
}

export interface StyledOptions {
  readonly dotStyle: DotStyle
  readonly color: string
  readonly bgColor: string
  readonly margin: number
}

/** 解析全部选项（默认值内联中文报错） */
export function resolveOptions(options: QrStylingOptions): StyledOptions {
  return {
    dotStyle: parseDotStyle(options.dotStyle),
    color: parseColor(options.color, '#000000'),
    bgColor: parseColor(options.bgColor, '#ffffff'),
    margin: parseMargin(options.margin),
  }
}

function moduleElement(dotStyle: DotStyle, x: number, y: number): string {
  if (dotStyle === 'dot') {
    return `<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42"/>`
  }
  if (dotStyle === 'rounded') {
    return `<rect x="${x + 0.08}" y="${y + 0.08}" width="0.84" height="0.84" rx="0.3"/>`
  }
  return `<rect x="${x}" y="${y}" width="1" height="1"/>`
}

function finderElement(ox: number, oy: number): string {
  return (
    `<g>` +
    `<rect x="${ox}" y="${oy}" width="7" height="7" rx="1.6"/>` +
    `<rect x="${ox + 1}" y="${oy + 1}" width="5" height="5" rx="1.1" class="finder-inner"/>` +
    `<rect x="${ox + 2}" y="${oy + 2}" width="3" height="3" rx="0.7"/>` +
    `</g>`
  )
}

/** 把矩阵渲染为同风格 SVG 字符串（模块坐标系，含静默区） */
export function matrixToStyledSvg(size: number, data: Uint8Array, opts: StyledOptions): string {
  const total = size + opts.margin * 2
  const m = opts.margin
  const parts: string[] = []
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x] && !inFinder(x, y, size)) {
        parts.push(moduleElement(opts.dotStyle, x + m, y + m))
      }
    }
  }
  const finders = [
    finderElement(m, m),
    finderElement(m + size - 7, m),
    finderElement(m, m + size - 7),
  ].join('')

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
    `style="width:320px;height:320px;image-rendering:pixelated">` +
    `<rect width="${total}" height="${total}" fill="${opts.bgColor}"/>` +
    `<g fill="${opts.color}">${parts.join('')}</g>` +
    `<g fill="${opts.color}">${finders}</g>` +
    `</svg>`
  )
}

/** toText / 复制用：空输入返回 ''，非法抛中文错，否则返回 SVG 字符串 */
export function toSvgText(input: QrStylingInput, options: QrStylingOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 2000) throw new Error('输入超过 2,000 字符上限')
  const opts = resolveOptions(options)
  const { size, data } = matrixOf(text)
  return matrixToStyledSvg(size, data, opts)
}
