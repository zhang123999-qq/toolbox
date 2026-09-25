import type { UuencodeInput, UuencodeOptions } from './schema'

/** 每行最多 45 个字节：45 + 0x20 = 'M'，正是经典 UUencode 的行长前缀 */
const LINE_BYTES = 45

/** 6 bit 值 → 可打印字符的偏移：0x20 + value，取值落在 0x20..0x5F */
const OFFSET = 0x20

/** begin 行的权限位，统一用 644（普通文件） */
const MODE = '644'

/** 缺省文件名（option.prefix 为空时回落到它） */
export const DEFAULT_NAME = 'data.txt'

/** 文件名里不能有空白，否则 begin 行会被解析成多段 */
export function normalizeName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, '_')
  return cleaned === '' ? DEFAULT_NAME : cleaned
}

/** 文本 → UUencode 文本：begin 行 + 数据行 + end 行 */
export function uuencode(text: string, name: string): string {
  const bytes = new TextEncoder().encode(text)
  const lines = [`begin ${MODE} ${normalizeName(name)}`]
  for (let i = 0; i < bytes.length; i += LINE_BYTES) {
    const chunk = bytes.subarray(i, i + LINE_BYTES)
    let line = String.fromCharCode(chunk.length + OFFSET)
    for (let j = 0; j < chunk.length; j += 3) {
      const remaining = chunk.length - j
      const group =
        (chunk[j] << 16) |
        ((remaining > 1 ? chunk[j + 1] : 0) << 8) |
        (remaining > 2 ? chunk[j + 2] : 0)
      // 3 字节 → 4 字符；不足 3 字节时只写 remaining + 1 个字符（经典做法）
      const take = remaining >= 3 ? 4 : remaining + 1
      for (let k = 0; k < take; k += 1) {
        line += String.fromCharCode(((group >>> (18 - 6 * k)) & 0x3f) + OFFSET)
      }
    }
    lines.push(line)
  }
  lines.push('end')
  return lines.join('\n')
}

/** 单个字符 → 6 bit 值：经典实现把 backtick 也当作 0，这里一并兼容 */
function charToValue(char: string): number {
  const code = char.charCodeAt(0)
  if (code === 0x60) return 0
  if (code < OFFSET || code > 0x5f) {
    throw new Error('字符 ' + JSON.stringify(char) + ' 不在 UUencode 字母表内')
  }
  return code - OFFSET
}

/**
 * UUencode 文本 → 原文。
 * 容忍缺失 begin / end 包裹行（很多系统只贴数据行），也容忍经典的零长度终止行。
 * 数据行里的空格是有意义的（6 bit 值为 0），因此**不能**对整行做 trim。
 */
export function uudecode(text: string): string {
  const bytes: number[] = []
  for (const raw of text.split(/\r?\n/)) {
    if (/^\s*begin\s+\d+\s+/.test(raw)) continue
    if (raw.trim() === 'end') break
    // 只跳过纯粹的空行；带前缀的行即使全是空格也是数据行
    if (raw === '') continue

    const count = charToValue(raw[0])
    if (count === 0) continue // 经典实现的终止行（backtick）或空白行
    const need = Math.ceil(count / 3) * 4
    const data = raw.slice(1)
    // 末组不足 3 字节时编码端本就少写 1~2 个字符，允许最多缺 2 个
    if (data.length < need - 2) {
      throw new Error('数据行长度与行首字节计数不一致')
    }
    const padded = data.padEnd(need, ' ')
    const groupBytes: number[] = []
    for (let i = 0; i < need; i += 4) {
      const group =
        (charToValue(padded[i]) << 18) |
        (charToValue(padded[i + 1]) << 12) |
        (charToValue(padded[i + 2]) << 6) |
        charToValue(padded[i + 3])
      groupBytes.push((group >>> 16) & 0xff, (group >>> 8) & 0xff, group & 0xff)
    }
    // 只取行首声明的前 count 个字节，补齐位的产物丢掉
    bytes.push(...groupBytes.slice(0, count))
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes))
}

export function transform(input: UuencodeInput, options: UuencodeOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  if (options.direction === 'decode') {
    try {
      return uudecode(input.text)
    } catch {
      throw new Error('解码失败：输入不是合法的 UUencode 内容，或解码结果不是合法的 UTF-8 文本')
    }
  }
  return uuencode(input.text, options.prefix)
}
