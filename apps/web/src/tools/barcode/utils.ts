import type { BarcodeInput, BarcodeOptions } from './schema'

/**
 * Code128 符号宽度表：取值 0–105 各对应一个 11 位模块图案（1=黑条，0=空白）。
 * 依据 ISO/IEC 15417（Code 128 规范）。106 为终止符，13 位。
 */
export const BIT_PATTERNS: readonly string[] = [
  '11011001100', // 0  SP
  '11001101100', // 1  !
  '11001100110', // 2  "
  '10010011000', // 3  #
  '10010001100', // 4  $
  '10001001100', // 5  %
  '10011001000', // 6  &
  '10011000100', // 7  '
  '10001100100', // 8  (
  '11001001000', // 9  )
  '11001000100', // 10 *
  '11000100100', // 11 +
  '10110011100', // 12 ,
  '10011011100', // 13 -
  '10011001110', // 14 .
  '10111001100', // 15 /
  '10011101100', // 16 0
  '10011100110', // 17 1
  '11001110010', // 18 2
  '11001011100', // 19 3
  '11001001110', // 20 4
  '11011100100', // 21 5
  '11001110100', // 22 6
  '11101101110', // 23 7
  '11101001100', // 24 8
  '11100101100', // 25 9
  '11100100110', // 26 :
  '11101100100', // 27 ;
  '11100110100', // 28 <
  '11100110010', // 29 =
  '11011011000', // 30 >
  '11011000110', // 31 ?
  '11000110110', // 32 @
  '10100011000', // 33 A
  '10001011000', // 34 B
  '10001000110', // 35 C
  '10110001000', // 36 D
  '10001101000', // 37 E
  '10001100010', // 38 F
  '11010001000', // 39 G
  '11000101000', // 40 H
  '11000100010', // 41 I
  '10110111000', // 42 J
  '10110001110', // 43 K
  '10001101110', // 44 L
  '10111011000', // 45 M
  '10111000110', // 46 N
  '10001110110', // 47 O
  '11101110110', // 48 P
  '11010001110', // 49 Q
  '11000101110', // 50 R
  '11011101000', // 51 S
  '11011100010', // 52 T
  '11011101110', // 53 U
  '11101011000', // 54 V
  '11101000110', // 55 W
  '11100010110', // 56 X
  '11101101000', // 57 Y
  '11101100010', // 58 Z
  '11100011010', // 59 [
  '11101111010', // 60 \
  '11001000010', // 61 ]
  '11110001010', // 62 SPACE
  '10100110000', // 63 _
  '10100001100', // 64 `
  '10010110000', // 65 a
  '10010000110', // 66 b
  '10000101100', // 67 c
  '10000100110', // 68 d
  '10110010000', // 69 e
  '10110000100', // 70 f
  '10011010000', // 71 g
  '10011000010', // 72 h
  '10000110100', // 73 i
  '10000110010', // 74 j
  '11000010010', // 75 k
  '11001010000', // 76 l
  '11110111010', // 77 m
  '11000010100', // 78 n
  '10001111010', // 79 o
  '10100111100', // 80 p
  '10010111100', // 81 q
  '10010011110', // 82 r
  '10111100100', // 83 s
  '10011110100', // 84 t
  '10011110010', // 85 u
  '11110100100', // 86 v
  '11110010100', // 87 w
  '11110010010', // 88 x
  '11011011110', // 89 y
  '11011110110', // 90 z
  '11110110110', // 91 {
  '10101111000', // 92 |
  '10100011110', // 93 }
  '10001011110', // 94 ~
  '10111101000', // 95 DEL
  '10111100010', // 96 FNC3
  '11110101000', // 97 FNC2
  '11110100010', // 98 SHIFT
  '10111011110', // 99 Code C
  '10111101110', // 100 Code B
  '11101011110', // 101 Code A
  '11110101110', // 102 FNC1
  '11010000100', // 103 START A
  '11010010000', // 104 START B
  '11010011100', // 105 START C
]

/** Code128 B 起始码 = 104；终止码 = 106（13 位图案） */
export const START_B = 104
export const STOP_BITS = '1100011101011'

const MAX_DATA = 80

/** 校验位：(起始码 + Σ i·v_i) mod 103，i 从 1 起 */
export function computeChecksum(dataValues: readonly number[]): number {
  let sum = START_B
  for (let i = 0; i < dataValues.length; i += 1) {
    sum += (i + 1) * dataValues[i]
  }
  return ((sum % 103) + 103) % 103
}

export interface EncodedCode128 {
  /** 完整符号序列：起始码 + 数据码 + 校验位 */
  readonly values: readonly number[]
  /** 拼接后的模块位串（含终止符） */
  readonly bits: string
  /** 校验位数值 */
  readonly checksum: number
}

/**
 * 把文本编码为 Code128 B：
 * - 每个字符值 = ASCII 码 - 32（仅支持可打印 ASCII 32–126）
 * - 起始码 104、末尾追加校验位与 13 位终止符
 */
export function encodeCode128B(text: string): EncodedCode128 {
  if (text === '') return { values: [], bits: '', checksum: 0 }
  if (text.length > MAX_DATA) {
    throw new Error(`内容过长，Code128 B 最多支持 ${MAX_DATA} 个字符`)
  }
  const dataValues: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 32 || code > 126) {
      throw new Error(`包含非 ASCII 可打印字符「${ch}」，仅支持空格到波浪线`)
    }
    dataValues.push(code - 32)
  }
  const checksum = computeChecksum(dataValues)
  const values = [START_B, ...dataValues, checksum]
  const bits = values.map((v) => BIT_PATTERNS[v]).join('') + STOP_BITS
  return { values, bits, checksum }
}

/** 条高校验：默认 80，范围 20–200 */
export function parseHeight(raw: string): number {
  const n = Number((raw || '80').trim())
  if (!Number.isInteger(n) || n < 20 || n > 200) {
    throw new Error('条高无效，须为 20–200 的整数（像素）')
  }
  return n
}

/** 模块线宽校验：默认 2，范围 1–5 */
export function parseLineWidth(raw: string): number {
  const n = Number((raw || '2').trim())
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error('线宽无效，须为 1–5 的整数（像素）')
  }
  return n
}

/**
 * 把模块位串渲染为 SVG 竖线：
 * 每个模块 = lineWidth 像素；连续黑条合并为一个矩形；左右各留 10 模块静默区。
 */
export function renderSvg(
  bits: string,
  text: string,
  opts: { height: number; lineWidth: number; showText: boolean },
): string {
  const quiet = 10 // 静默区（模块数）
  const totalModules = quiet * 2 + bits.length
  const width = totalModules * opts.lineWidth
  const textHeight = opts.showText ? Math.round(opts.height * 0.3) : 0
  const height = opts.height + textHeight + (opts.showText ? 6 : 0)

  const bars: string[] = []
  let x = quiet
  let i = 0
  while (i < bits.length) {
    if (bits[i] === '1') {
      let j = i
      while (j < bits.length && bits[j] === '1') j += 1
      const barModules = j - i
      bars.push(
        `<rect x="${(x * opts.lineWidth).toFixed(1)}" y="0" ` +
          `width="${(barModules * opts.lineWidth).toFixed(1)}" height="${opts.height}"/>`,
      )
      x += barModules
      i = j
    } else {
      i += 1
      x += 1
    }
  }

  const textEl = opts.showText
    ? `<text x="${(width / 2).toFixed(1)}" y="${opts.height + textHeight}" ` +
      `text-anchor="middle" font-family="monospace" font-size="${textHeight}" fill="#000000">` +
      escapeXml(text) +
      `</text>`
    : ''

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `style="width:${width}px;height:auto">` +
    `<rect width="${width}" height="${height}" fill="#ffffff"/>` +
    `<g fill="#000000">${bars.join('')}</g>${textEl}</svg>`
  )
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 主转换：空输入返回 ''，非法输入抛中文错，否则返回 SVG 字符串 */
export function transform(input: BarcodeInput, options: BarcodeOptions): string {
  const text = input.text
  if (text.trim() === '') return ''
  const height = parseHeight(options.height)
  const lineWidth = parseLineWidth(options.lineWidth)
  const encoded = encodeCode128B(text)
  return [
    `<!-- Code128 B · ${text.length} 字符 · 校验位 ${encoded.checksum} -->`,
    renderSvg(encoded.bits, text, { height, lineWidth, showText: options.showText }),
  ].join('\n')
}
