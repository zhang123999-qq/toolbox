/**
 * 零宽 / 方向控制字符与隐写水印的共用实现。
 *
 * 文本域 #42「零宽字符」、#57「文本水印」、#58「文本去水印」都要用到同一套
 * 判定与编解码。按 DEVELOPMENT.md §8.4「工具之间禁止互相 import，共用逻辑
 * 一律上提到 lib」，这里只放与 UI 无关的纯函数。
 */

/** 零宽与方向控制字符的码位集合 */
export const ZERO_WIDTH_CODES: ReadonlySet<number> = new Set([
  0x200b, // 零宽空格
  0x200c, // 零宽非连接符
  0x200d, // 零宽连接符
  0x200e, // 左至右标记
  0x200f, // 右至左标记
  0x202a, // 左至右嵌入
  0x202b, // 右至左嵌入
  0x202c, // 方向格式化结束
  0x202d, // 左至右重写
  0x202e, // 右至左重写
  0x2060, // 词连接符
  0x2061, // 函数应用
  0x2062, // 不可见乘号
  0x2063, // 不可见分隔符
  0x2064, // 不可见加号
  0xfeff, // 零宽不换行空格（BOM）
])

const NAMES: Readonly<Record<number, string>> = {
  0x200b: '零宽空格',
  0x200c: '零宽非连接符',
  0x200d: '零宽连接符',
  0x200e: '左至右标记',
  0x200f: '右至左标记',
  0x2060: '词连接符',
  0xfeff: '零宽不换行空格（BOM）',
}

/** 是否零宽 / 方向控制字符 */
export function isZeroWidthCode(code: number): boolean {
  return ZERO_WIDTH_CODES.has(code)
}

/** 名称：有名的用专名，其余给统称 */
export function zeroWidthName(code: number): string {
  return NAMES[code] ?? '零宽 / 方向控制字符'
}

/** 码位转 U+XXXX */
export function hexOf(code: number): string {
  return 'U+' + code.toString(16).toUpperCase().padStart(4, '0')
}

/**
 * 隐写用的两位字母表。
 * 用 U+200C / U+200D 分别表示 0 与 1：两者都是零宽字符，且不在 U+200B 之外，
 * 这样「有水印」与「排版里常见的零宽空格」能被区分开。
 */
export const BIT_ZERO = 0x200c
export const BIT_ONE = 0x200d

/** 把 UTF-8 字节流编成零宽字符序列 */
export function encodeHidden(payload: string): string {
  const bytes = new TextEncoder().encode(payload)
  let out = ''
  for (const byte of bytes) {
    for (let bit = 7; bit >= 0; bit -= 1) {
      out += String.fromCodePoint((byte >> bit) & 1 ? BIT_ONE : BIT_ZERO)
    }
  }
  return out
}

/** 取出文本里属于隐写字母表的字符 */
function bitsOf(text: string): number[] {
  const bits: number[] = []
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    if (code === BIT_ZERO) bits.push(0)
    else if (code === BIT_ONE) bits.push(1)
  }
  return bits
}

/**
 * 从文本里解出隐藏内容。
 * 位流不是 8 的整数倍、或解出来不是合法 UTF-8 时返回 null（说明没有水印或已被破坏）。
 */
export function decodeHidden(text: string): string | null {
  const bits = bitsOf(text)
  if (bits.length === 0 || bits.length % 8 !== 0) return null
  const bytes = new Uint8Array(bits.length / 8)
  for (let i = 0; i < bytes.length; i += 1) {
    let byte = 0
    for (let bit = 0; bit < 8; bit += 1) byte = (byte << 1) | bits[i * 8 + bit]
    bytes[i] = byte
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** 移除全部零宽 / 方向控制字符 */
export function stripZeroWidth(text: string): string {
  return [...text].filter((ch) => !isZeroWidthCode(ch.codePointAt(0) ?? 0)).join('')
}

/** 把零宽 / 方向控制字符换成可见标记，便于确认它们原本的位置 */
export function markZeroWidth(text: string, marker: string): string {
  return [...text].map((ch) => (isZeroWidthCode(ch.codePointAt(0) ?? 0) ? marker : ch)).join('')
}

/** 统计零宽 / 方向控制字符的个数 */
export function countZeroWidth(text: string): number {
  return [...text].filter((ch) => isZeroWidthCode(ch.codePointAt(0) ?? 0)).length
}
