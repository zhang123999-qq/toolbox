import type { Base32Input, Base32Options } from './schema'

/** RFC 4648 字母表：A-Z 与 2-7（不含 0/1/8/9，避免与 O/I/B 混淆） */
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/** 每 5 bit 输出一个字符；不足的位补零凑成 8 的倍数，末尾用 = 填充 */
export function encodeBase32(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let buffer = 0
  let bits = 0
  let out = ''
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31]
  while (out.length % 8 !== 0) out += '='
  return out
}

/**
 * 解码：容忍小写、空格与换行（很多系统输出的 Base32 会折行），
 * `=` 填充可有可无。遇到字母表外的字符直接报错，不静默丢弃。
 */
export function decodeBase32(text: string): string {
  const cleaned = text.replace(/[\s=]/g, '').toUpperCase()
  if (cleaned === '') return ''
  let buffer = 0
  let bits = 0
  const bytes: number[] = []
  for (const char of cleaned) {
    const index = ALPHABET.indexOf(char)
    if (index === -1) throw new Error('输入含 Base32 字母表之外的字符：' + char)
    buffer = (buffer << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
}

export function transform(input: Base32Input, options: Base32Options): string {
  if (input.text === '') return ''
  try {
    if (options.direction === 'decode') return decodeBase32(input.text)
    return encodeBase32(input.text)
  } catch {
    throw new Error('解码失败：输入不是合法的 Base32，或解码结果不是合法的 UTF-8 文本')
  }
}
