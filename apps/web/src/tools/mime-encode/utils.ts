import type { MimeEncodeInput, MimeEncodeOptions } from './schema'

/** 十六进制字母表（RFC 2047 Q 模式要求大写） */
const HEX = '0123456789ABCDEF'

/** RFC 2047 §2：单个 encoded-word 总长（含 =? 与 ?=）不得超过 75 字符 */
const MAX_WORD_LENGTH = 75

/** RFC 5322：头部行的推荐上限（用于折行判断） */
const MAX_LINE_LENGTH = 76

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 是否含非 ASCII 字符（只有含非 ASCII 时才需要编码成 encoded-word） */
function hasNonAscii(text: string): boolean {
  return /[\u0080-\uffff]/.test(text)
}

/** 字节 → 二进制字符串（btoa 只接受 latin1 字符） */
function bytesToBinaryString(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return out
}

/** 二进制字符串 → 字节 */
function binaryStringToBytes(binary: string): Uint8Array {
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** encoded-word 的固定骨架长度：'=?' + charset + '?' + mode + '?' + data + '?=' */
function skeletonLength(charset: string): number {
  return 7 + charset.length
}

/**
 * B 模式分块：先算出一个 encoded-word 里最多能放多少**字节**。
 * base64 后的长度必为 4 的倍数，所以要向下取整到 4 的倍数再折算回字节数。
 */
function maxBytesPerWord(charset: string): number {
  const budget = MAX_WORD_LENGTH - skeletonLength(charset)
  return 3 * Math.floor(budget / 4)
}

/** B 模式：按 UTF-8 字节分块，保证每个 encoded-word 不超过 75 字符 */
function encodeBWords(text: string, charset: string): string[] {
  const limit = maxBytesPerWord(charset)
  const words: string[] = []
  let chunk: number[] = []
  let byteCount = 0
  const flush = () => {
    words.push(`=?${charset}?B?${btoa(bytesToBinaryString(Uint8Array.from(chunk)))}?=`)
    chunk = []
    byteCount = 0
  }
  for (const ch of text) {
    const encoded = new TextEncoder().encode(ch)
    if (byteCount + encoded.length > limit) flush()
    chunk.push(...encoded)
    byteCount += encoded.length
  }
  if (chunk.length > 0) flush()
  return words
}

/** Q 模式里可以直接出现的字节（RFC 2047 §4.2：空格、= ? _ 必须转义） */
function isQLiteral(byte: number): boolean {
  return (
    (byte >= 0x21 && byte <= 0x3c) ||
    byte === 0x3e ||
    (byte >= 0x40 && byte <= 0x5e) ||
    byte === 0x60 ||
    (byte >= 0x61 && byte <= 0x7e)
  )
}

/** 单个字符的 Q 编码：空格写成 '_'，其余按字节转义 */
function qEncodeChar(ch: string): string {
  let out = ''
  for (const byte of new TextEncoder().encode(ch)) {
    if (byte === 0x20) out += '_'
    else if (isQLiteral(byte)) out += String.fromCharCode(byte)
    else out += '=' + HEX[byte >> 4] + HEX[byte & 0x0f]
  }
  return out
}

/** Q 模式：按编码后的实际长度分块（每个字符 1–12 字符不等） */
function encodeQWords(text: string, charset: string): string[] {
  const budget = MAX_WORD_LENGTH - skeletonLength(charset)
  const words: string[] = []
  let data = ''
  for (const ch of text) {
    const token = qEncodeChar(ch)
    if (data.length + token.length > budget) {
      words.push(`=?${charset}?Q?${data}?=`)
      data = ''
    }
    data += token
  }
  if (data !== '') words.push(`=?${charset}?Q?${data}?=`)
  return words
}

/** 多个 encoded-word 的拼接：整行放得下就用空格，放不下就按 RFC 折行（CRLF + 空格） */
function joinWords(words: readonly string[]): string {
  if (words.length === 0) return ''
  if (words.length === 1) return words[0]
  const single = words.join(' ')
  return single.length <= MAX_LINE_LENGTH ? single : words.join('\r\n ')
}

/** 纯 ASCII 头：按空白折行到 76 字符以内（RFC 5322 §2.2.3 的折行） */
function foldAscii(text: string): string {
  if (text.length <= MAX_LINE_LENGTH) return text
  const words = text.split(' ')
  let out = ''
  let current = ''
  for (const word of words) {
    if (current === '') {
      current = word
      continue
    }
    if (current.length + 1 + word.length > MAX_LINE_LENGTH) {
      out += (out === '' ? '' : '\r\n ') + current
      current = word
    } else {
      current += ' ' + word
    }
  }
  if (current !== '') out += (out === '' ? '' : '\r\n ') + current
  return out
}

/** 文本 → 邮件头：纯 ASCII 原样输出（必要时折行），含非 ASCII 才编码成 encoded-word */
export function encodeMimeHeader(text: string, charset: string, mode: string): string {
  if (!hasNonAscii(text)) return foldAscii(text)
  const words = mode === 'B' ? encodeBWords(text, charset) : encodeQWords(text, charset)
  return joinWords(words)
}

/** 折行还原：CRLF（或裸 CR / LF）后紧跟的空白保留，换行本身去掉 */
function unfold(text: string): string {
  return text.replace(/(?:\r\n|\r|\n)([ \t])/g, '$1')
}

/** 按 UTF-8 解字节；失败时再试声明的字符集（便于吃下 latin1 之类的外部邮件头） */
function decodeBytes(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // 继续尝试声明的字符集
  }
  try {
    return new TextDecoder(charset, { fatal: true }).decode(bytes)
  } catch {
    throw new Error(`解码失败：字节无法按 UTF-8 或 ${charset} 还原为文本`)
  }
}

/** base64 → 字节；数据非法时给出可读错误（而不是把 atob 的原始报错抛给用户） */
function base64ToBytes(data: string): Uint8Array {
  try {
    return binaryStringToBytes(atob(data))
  } catch {
    throw new Error('解码失败：encoded-word 的 base64 数据不合法')
  }
}

/** 单个 encoded-word 的内容 → 文本 */
function decodeWord(charset: string, mode: string, data: string): string {
  if (mode.toUpperCase() === 'B') {
    const cleaned = data.replace(/\s+/g, '')
    const normalized = cleaned.replace(/-/g, '+').replace(/_/g, '/')
    const padding = (4 - (normalized.length % 4)) % 4
    return decodeBytes(base64ToBytes(normalized + '='.repeat(padding)), charset)
  }

  const bytes: number[] = []
  const chars = Array.from(data.replace(/_/g, ' '))
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    if (ch === '=') {
      const hex = chars.slice(i + 1, i + 3).join('')
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        throw new Error(`解码失败：encoded-word 里第 ${i + 1} 个字符处的“=”转义不合法`)
      }
      bytes.push(Number.parseInt(hex, 16))
      i += 2
      continue
    }
    const code = ch.codePointAt(0) ?? 0
    if (code < 0x80) bytes.push(code)
    else for (const byte of new TextEncoder().encode(ch)) bytes.push(byte)
  }
  return decodeBytes(Uint8Array.from(bytes), charset)
}

/**
 * 邮件头 → 文本：识别所有 encoded-word 并还原；
 * 按 RFC 2047 §6.2，两个**相邻** encoded-word 之间的空白在还原时丢弃。
 */
export function decodeMimeHeader(text: string): string {
  const unfolded = unfold(text)
  const pattern = /=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g
  interface Segment {
    readonly kind: 'text' | 'word'
    readonly value: string
  }
  const segments: Segment[] = []
  let last = 0
  let match = pattern.exec(unfolded)
  while (match !== null) {
    if (match.index > last) {
      segments.push({ kind: 'text', value: unfolded.slice(last, match.index) })
    }
    segments.push({ kind: 'word', value: decodeWord(match[1], match[2], match[3]) })
    last = match.index + match[0].length
    match = pattern.exec(unfolded)
  }
  if (segments.length === 0) return unfolded
  if (last < unfolded.length) segments.push({ kind: 'text', value: unfolded.slice(last) })

  let out = ''
  segments.forEach((segment, index) => {
    const betweenWords = index > 0 && index < segments.length - 1
    if (segment.kind === 'text' && betweenWords && /^\s*$/.test(segment.value)) return
    out += segment.value
  })
  return out
}

export function transform(input: MimeEncodeInput, options: MimeEncodeOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'encode') {
    return encodeMimeHeader(input.text, options.charset, options.mode)
  }
  return decodeMimeHeader(input.text)
}
