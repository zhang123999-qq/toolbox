import QRCode from 'qrcode'
import type { TextToQrInput, TextToQrOptions } from './schema'

/** 二维码矩阵：true 表示深色模块 */
export interface Matrix {
  readonly size: number
  readonly version: number
  readonly dark: (x: number, y: number) => boolean
}

/**
 * 取矩阵。用 qrcode 的同步 create()：它只算编码与纠错，不碰 canvas，
 * 因此可以在纯函数里用，也不需要在测试环境里补 canvas。
 */
export function matrixOf(text: string, level: string): Matrix {
  const qr = QRCode.create(text, {
    errorCorrectionLevel: level as 'L' | 'M' | 'Q' | 'H',
  })
  const size = qr.modules.size
  const data = qr.modules.data
  return {
    size,
    version: qr.version,
    dark: (x, y) => Boolean(data[y * size + x]),
  }
}

/** 渲染成 SVG：viewBox 用模块数，缩放交给 CSS */
export function matrixToSvg(matrix: Matrix, margin: number): string {
  const total = matrix.size + margin * 2
  const rects: string[] = []
  for (let y = 0; y < matrix.size; y += 1) {
    for (let x = 0; x < matrix.size; x += 1) {
      if (matrix.dark(x, y)) {
        rects.push('<rect x="' + (x + margin) + '" y="' + (y + margin) + '" width="1" height="1"/>')
      }
    }
  }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    total +
    ' ' +
    total +
    '" style="width:100%;height:auto;image-rendering:pixelated">' +
    '<rect width="' +
    total +
    '" height="' +
    total +
    '" fill="#fff"/>' +
    '<g fill="#000">' +
    rects.join('') +
    '</g></svg>'
  )
}

/** 文本块版本：两个字符宽一个模块，等宽字体下才看得清 */
export function matrixToText(matrix: Matrix): string {
  const rows: string[] = []
  for (let y = 0; y < matrix.size; y += 1) {
    let row = ''
    for (let x = 0; x < matrix.size; x += 1) row += matrix.dark(x, y) ? '██' : '  '
    rows.push(row)
  }
  return rows.join('\n')
}

/** 静默区：规范建议 4 个模块 */
const MARGIN = 4

/** 页面输出：SVG 图 + 一行元信息 */
export function qrHtml(input: TextToQrInput, options: TextToQrOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  const matrix = matrixOf(text, options.level)
  return (
    '<div class="qr-box">' +
    matrixToSvg(matrix, MARGIN) +
    '<p class="qr-meta">版本 ' +
    matrix.version +
    ' · ' +
    matrix.size +
    '×' +
    matrix.size +
    ' 模块 · 容错等级 ' +
    options.level +
    '</p></div>'
  )
}

/** 纯文本版本：文本块二维码，供复制 / 下载 */
export function qrText(input: TextToQrInput, options: TextToQrOptions): string {
  const text = input.text.trim()
  if (text === '') return ''
  return matrixToText(matrixOf(text, options.level))
}
