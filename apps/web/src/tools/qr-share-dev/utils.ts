import QRCode from 'qrcode'
import type { QrShareDevInput, QrShareDevOptions } from './schema'

/** 用 qrcode 的同步 create() 取矩阵，不碰 canvas，纯函数可测 */
export function matrixOf(
  text: string,
  level: string,
): {
  size: number
  version: number
  data: Uint8Array
} {
  const qr = QRCode.create(text, {
    errorCorrectionLevel: level as 'L' | 'M' | 'Q' | 'H',
  })
  return { size: qr.modules.size, version: qr.version, data: qr.modules.data as Uint8Array }
}

/** 渲染成 SVG 字符串（含 4 模块静默区） */
export function matrixToSvg(size: number, data: Uint8Array): string {
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
    `style="width:256px;height:auto;image-rendering:pixelated">` +
    `<rect width="${total}" height="${total}" fill="#fff"/>` +
    `<g fill="#000">${rects.join('')}</g></svg>`
  )
}

export function transform(input: QrShareDevInput, options: QrShareDevOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  if (input.text.length > 2000) throw new Error('输入超过 2,000 字符上限')
  const { size, version, data } = matrixOf(text, options.level)
  return [
    `<!-- 版本 ${version} · ${size}×${size} 模块 · 容错 ${options.level} · 扫码分享 -->`,
    matrixToSvg(size, data),
  ].join('\n')
}
