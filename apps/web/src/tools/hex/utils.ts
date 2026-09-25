import type { HexInput, HexOptions } from './schema'

/**
 * 编码：文本先按 UTF-8 转成字节，再逐字节写成两位十六进制。
 * `separator` 只影响字节之间的连接方式：`0x` 前缀按 `0x68 0x69` 这类 C 数组写法输出。
 */
export function encodeHex(text: string, separator: string, uppercase: boolean): string {
  const parts: string[] = []
  for (const byte of new TextEncoder().encode(text)) {
    const hex = byte.toString(16).padStart(2, '0')
    const fixed = uppercase ? hex.toUpperCase() : hex
    parts.push(separator === '0x' ? '0x' + fixed : fixed)
  }
  if (separator === 'hyphen') return parts.join('-')
  if (separator === 'space' || separator === '0x') return parts.join(' ')
  return parts.join('')
}

/**
 * 解码：宽容处理各种常见写法——空格、逗号、连字符、`0x` / `\x` 前缀都会被忽略，
 * 因此从代码、抓包、日志里直接复制过来的十六进制串基本都能吃下。
 * 还原结果必须是合法 UTF-8，二进制数据会明确报错而不是产出乱码。
 */
export function decodeHex(text: string): string {
  const cleaned = text
    .replace(/0[xX]/g, '')
    .replace(/\\[xX]/g, '')
    .replace(/[\s,-]+/g, '')
  if (cleaned === '') return ''
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) throw new Error('解码失败：输入含非十六进制字符')
  if (cleaned.length % 2 !== 0) {
    throw new Error('解码失败：十六进制字符数为奇数，无法按字节还原')
  }

  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

export function transform(input: HexInput, options: HexOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'decode') {
    try {
      return decodeHex(input.text)
    } catch (error) {
      // 自己抛的中文错误直接透传；TextDecoder 抛的换成人能读的文案
      if (error instanceof Error && error.message.startsWith('解码失败')) throw error
      throw new Error('解码失败：还原结果不是合法的 UTF-8 文本', { cause: error })
    }
  }
  return encodeHex(input.text, options.separator, options.uppercase)
}
