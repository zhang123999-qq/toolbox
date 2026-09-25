import type { Base85Input, Base85Options } from './schema'

/** Z85（ZeroMQ）字母表：85 个可打印字符，顺序是规范写死的，不能改 */
const Z85_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#'

/** ASCII85 用连续 85 个可打印字符做字母表，起点是 `!`（33） */
const ASCII85_BASE = 33

const pow85 = [85 ** 4, 85 ** 3, 85 ** 2, 85, 1]

/** ASCII85：每 4 字节 → 5 个字符；末组不足 4 字节时按实际长度输出 */
export function encodeAscii85(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let out = ''
  for (let i = 0; i < bytes.length; i += 4) {
    const chunk = bytes.subarray(i, i + 4)
    const missing = 4 - chunk.length
    let value = 0
    for (let j = 0; j < 4; j += 1) value = value * 256 + (chunk[j] ?? 0)
    // 全零组按规范可缩写成一个 'z'（仅对完整 4 字节组生效）
    if (missing === 0 && value === 0) {
      out += 'z'
      continue
    }
    let group = ''
    for (const unit of pow85) {
      group += String.fromCharCode(ASCII85_BASE + (Math.floor(value / unit) % 85))
    }
    out += group.slice(0, 5 - missing)
  }
  return out
}

/** ASCII85 解码；支持 'z' 缩写与空白 */
export function decodeAscii85(text: string): string {
  const cleaned = text.replace(/\s+/g, '').replace(/^<~/, '').replace(/~>$/, '')
  if (cleaned === '') return ''
  const bytes: number[] = []
  let group = ''
  for (const char of cleaned) {
    if (char === 'z' && group === '') {
      bytes.push(0, 0, 0, 0)
      continue
    }
    const code = char.charCodeAt(0) - ASCII85_BASE
    if (code < 0 || code > 84) throw new Error('输入含 ASCII85 字母表之外的字符：' + char)
    group += char
    if (group.length === 5) {
      bytes.push(...groupToBytes(group, 4))
      group = ''
    }
  }
  if (group.length > 0) {
    const missing = 5 - group.length
    group += 'u'.repeat(missing) // 补齐用的字符按规范取 'u'（最大值）
    bytes.push(...groupToBytes(group, 4 - missing))
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
}

/** 把 5 个 ASCII85 字符还原成最多 4 个字节 */
function groupToBytes(group: string, keep: number): number[] {
  let value = 0
  for (const char of group) value = value * 85 + (char.charCodeAt(0) - ASCII85_BASE)
  const out: number[] = []
  for (let shift = 3; shift >= 0; shift -= 1) out.push((value >>> (shift * 8)) & 255)
  return out.slice(0, keep)
}

/** Z85：4 字节 → 5 字符；要求输入是 4 的倍数，不足时补零字节 */
export function encodeZ85(text: string): string {
  const raw = new TextEncoder().encode(text)
  const bytes = new Uint8Array(Math.ceil(raw.length / 4) * 4)
  bytes.set(raw)
  let out = ''
  for (let i = 0; i < bytes.length; i += 4) {
    let value = 0
    for (let j = 0; j < 4; j += 1) value = value * 256 + bytes[i + j]
    let group = ''
    for (const unit of pow85) group += Z85_ALPHABET[Math.floor(value / unit) % 85]
    out += group
  }
  return out
}

export function decodeZ85(text: string): string {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned === '') return ''
  if (cleaned.length % 5 !== 0) throw new Error('Z85 输入长度必须是 5 的倍数')
  const bytes: number[] = []
  for (let i = 0; i < cleaned.length; i += 5) {
    let value = 0
    for (const char of cleaned.slice(i, i + 5)) {
      const index = Z85_ALPHABET.indexOf(char)
      if (index === -1) throw new Error('输入含 Z85 字母表之外的字符：' + char)
      value = value * 85 + index
    }
    for (let shift = 3; shift >= 0; shift -= 1) bytes.push((value >>> (shift * 8)) & 255)
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
}

export function transform(input: Base85Input, options: Base85Options): string {
  if (input.text === '') return ''
  try {
    if (options.mode === 'z85') {
      return options.direction === 'decode' ? decodeZ85(input.text) : encodeZ85(input.text)
    }
    return options.direction === 'decode' ? decodeAscii85(input.text) : encodeAscii85(input.text)
  } catch {
    throw new Error('解码失败：输入不是合法的 Base85，或解码结果不是合法的 UTF-8 文本')
  }
}
