import type { QuotedPrintableInput, QuotedPrintableOptions } from './schema'

/** 十六进制字母表（RFC 2045 要求大写） */
const HEX = '0123456789ABCDEF'

/** RFC 2045：一行最多 76 个字符 */
const MAX_LINE_LENGTH = 76

/** 至少要能容下一个 =XX（3 字符）加软换行的 '='，否则无解 */
const MIN_LINE_LENGTH = 8

/** 空格与制表符（行尾时必须转义） */
const SPACE = 0x20
const TAB = 0x09
/** '=' 在 QP 里是转义引导符，本身必须转义 */
const EQUALS = 0x3d

/** 把选项里的「每行字符数」解析成整数，非法值给出可读错误 */
export function parseLineLength(raw: string): number {
  const value = Number(raw.trim())
  if (!Number.isInteger(value)) {
    throw new Error(`选项错误：每行字符数“${raw}”不是整数`)
  }
  if (value < MIN_LINE_LENGTH || value > MAX_LINE_LENGTH) {
    throw new Error(`选项错误：每行字符数需在 ${MIN_LINE_LENGTH}–${MAX_LINE_LENGTH} 之间`)
  }
  return value
}

function escapeByte(byte: number): string {
  return '=' + HEX[byte >> 4] + HEX[byte & 0x0f]
}

/**
 * 单行编码：可打印 ASCII 直接保留，其余写成 =XX。
 * 行尾的空格/制表符必须转义，否则经过邮件网关时会被悄悄吃掉。
 */
function encodeLineTokens(line: string): string[] {
  const bytes = Array.from(new TextEncoder().encode(line))
  let tail = bytes.length
  while (tail > 0 && (bytes[tail - 1] === SPACE || bytes[tail - 1] === TAB)) tail -= 1
  return bytes.map((byte, index) => {
    const literal = index < tail && byte >= 0x20 && byte <= 0x7e && byte !== EQUALS
    return literal ? String.fromCharCode(byte) : escapeByte(byte)
  })
}

/** 按 maxLength 折行：行末不够放时补一个 '=' 作为软换行（RFC 2045 §6.7） */
function wrapTokens(tokens: readonly string[], maxLength: number): string {
  // 软换行的 '=' 自身要占一格，因此正文最多用 maxLength - 1
  const usable = maxLength - 1
  const lines: string[] = []
  let current = ''
  for (const token of tokens) {
    if (current.length + token.length > usable) {
      lines.push(current + '=')
      current = ''
    }
    current += token
  }
  lines.push(current)
  return lines.join('\r\n')
}

/** 文本 → Quoted-Printable：行分隔统一写成 CRLF，超长处插入软换行 */
export function encodeQuotedPrintable(text: string, maxLength: number): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => wrapTokens(encodeLineTokens(line), maxLength))
    .join('\r\n')
}

/**
 * Quoted-Printable → 文本：
 * 先去掉软换行（'=' 紧邻换行），再把 =XX 还原成字节，最后按 UTF-8 组装。
 * 输出统一用 LF 换行，便于和输入框里的文本直接比对。
 */
export function decodeQuotedPrintable(text: string): string {
  const unfolded = text.replace(/=(?:\r\n|\r|\n)/g, '')
  // 按码点遍历：原始非 ASCII 字符（少见，但不该被拆成代理项）才能整块按 UTF-8 收下
  const chars = Array.from(unfolded)
  const bytes: number[] = []
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    if (ch === '=') {
      const hex = chars.slice(i + 1, i + 3).join('')
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        throw new Error(`解码失败：第 ${i + 1} 个字符处的“=”转义不合法，应为 =XX`)
      }
      bytes.push(Number.parseInt(hex, 16))
      i += 2
      continue
    }
    const code = ch.codePointAt(0) ?? 0
    if (code < 0x80) {
      bytes.push(code)
    } else {
      // 严格来说 QP 正文不该出现原始非 ASCII 字符；这里宽容地按 UTF-8 收下
      for (const byte of new TextEncoder().encode(ch)) bytes.push(byte)
    }
  }
  try {
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes))
    return decoded.replace(/\r\n|\r/g, '\n')
  } catch {
    throw new Error('解码失败：还原结果不是合法的 UTF-8 文本')
  }
}

export function transform(input: QuotedPrintableInput, options: QuotedPrintableOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'decode') return decodeQuotedPrintable(input.text)
  return encodeQuotedPrintable(input.text, parseLineLength(options.length))
}
