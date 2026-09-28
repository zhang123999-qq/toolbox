import QRCode from 'qrcode'
import type { QrcodeInput, QrcodeOptions } from './schema'

const VALID_LEVELS = ['L', 'M', 'Q', 'H'] as const
const MAX_TEXT = 2000

export interface QrMatrix {
  readonly size: number
  readonly version: number
  readonly data: Uint8Array
}

/**
 * 用 qrcode 库的同步 create() 取二维码矩阵（纯函数，不碰 DOM）。
 * level 取值 L / M / Q / H，分别对应约 7% / 15% / 25% / 30% 容错。
 */
export function matrixOf(text: string, level: string): QrMatrix {
  const qr = QRCode.create(text, {
    errorCorrectionLevel: level as (typeof VALID_LEVELS)[number],
  })
  return {
    size: qr.modules.size,
    version: qr.version,
    data: qr.modules.data as Uint8Array,
  }
}

/** 容错级别校验：默认 M */
export function parseLevel(raw: string): string {
  const level = (raw || 'M').toUpperCase()
  if (!VALID_LEVELS.includes(level as (typeof VALID_LEVELS)[number])) {
    throw new Error('容错级别无效，仅支持 L / M / Q / H')
  }
  return level
}

/** SVG 渲染尺寸（px）：默认 256，范围 64–1024 */
export function parseSize(raw: string): number {
  const text = (raw || '256').trim()
  const n = Number(text)
  if (!Number.isInteger(n) || n < 64 || n > 1024) {
    throw new Error('尺寸无效，须为 64–1024 的整数（像素）')
  }
  return n
}

/**
 * 把二维码矩阵渲染为 SVG 字符串：
 * viewBox 以「模块」为单位（含 4 模块静默区），显示尺寸由 pixelSize 控制。
 */
export function matrixToSvg(size: number, data: Uint8Array, pixelSize: number): string {
  const margin = 4
  const total = size + margin * 2
  const rects: string[] = []
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) {
        rects.push(`<rect x="${x + margin}" y="${y + margin}" width="1" height="1"/>`)
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
    `style="width:${pixelSize}px;height:${pixelSize}px;image-rendering:pixelated">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<g fill="#000000">${rects.join('')}</g></svg>`
  )
}

/** 主转换：空输入返回 ''，超长 / 非法选项抛中文错，否则返回 SVG 字符串 */
export function transform(input: QrcodeInput, options: QrcodeOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > MAX_TEXT) {
    throw new Error(`输入超过 ${MAX_TEXT.toLocaleString()} 字符上限`)
  }
  const level = parseLevel(options.level)
  const pixelSize = parseSize(options.size)
  const { size, version, data } = matrixOf(text, level)
  return [
    `<!-- 版本 ${version} · ${size}×${size} 模块 · 容错 ${level} -->`,
    matrixToSvg(size, data, pixelSize),
  ].join('\n')
}
