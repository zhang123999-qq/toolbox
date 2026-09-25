import type { DataUrlInput, DataUrlOptions } from './schema'

/** 字节分块大小：避免 String.fromCharCode(...bytes) 参数过多导致栈溢出 */
const CHUNK = 0x8000

/** 二进制内容的十六进制预览上限（字节），避免几 MB 的载荷把输出撑爆 */
const HEX_PREVIEW_LIMIT = 256

/** RFC 2397 里 data 部分可直接出现的字符，其余一律百分号转义 */
const URL_SAFE = /^[A-Za-z0-9\-_.!~*'()]$/

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

/** 按百分号转义拼接字节 */
function percentEncode(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) {
    const ch = String.fromCharCode(byte)
    out += URL_SAFE.test(ch) ? ch : '%' + byte.toString(16).toUpperCase().padStart(2, '0')
  }
  return out
}

/** 生成 Data URL：只对 text/* 追加 charset，避免给 image/png 之类塞进无意义的参数 */
export function encodeDataUrl(text: string, mode: string, type: string): string {
  const mime = type.trim() === '' ? 'text/plain' : type.trim()
  const head =
    mime.includes(';') || !mime.toLowerCase().startsWith('text/') ? mime : mime + ';charset=utf-8'
  const bytes = new TextEncoder().encode(text)
  if (mode === 'base64') return `data:${head};base64,${btoa(bytesToBinaryString(bytes))}`
  return `data:${head},${percentEncode(bytes)}`
}

/** 解析结果：拆出的元信息 + 还原后的内容 */
export interface ParsedDataUrl {
  readonly mime: string
  readonly charset: string
  readonly base64: boolean
  readonly bytes: number
  /** 内容是否无法按 UTF-8 解成文本 */
  readonly binary: boolean
  /** 文本内容；二进制时是十六进制预览 */
  readonly content: string
}

/** 百分号解码 → 字节（未转义的原始非 ASCII 字符按 UTF-8 补齐） */
function percentDecode(payload: string): Uint8Array {
  const out: number[] = []
  const chars = Array.from(payload)
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i]
    if (ch === '%') {
      const hex = chars.slice(i + 1, i + 3).join('')
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        throw new Error(`解析失败：百分号转义不完整，应为 %XX，实际是“%${hex}”`)
      }
      out.push(Number.parseInt(hex, 16))
      i += 2
      continue
    }
    const code = ch.codePointAt(0) ?? 0
    if (code > 0x7f) out.push(...new TextEncoder().encode(ch))
    else out.push(code)
  }
  return Uint8Array.from(out)
}

/** 解析 Data URL：拆出 MIME 类型、字符集、是否 base64，并还原内容 */
export function parseDataUrl(text: string): ParsedDataUrl {
  const match = /^data:([^,]*),([\s\S]*)$/i.exec(text.trim())
  if (!match) throw new Error('解析失败：输入不是 data: 开头的 Data URL')
  const metaPart = match[1] ?? ''
  const payload = match[2] ?? ''

  const params = metaPart.split(';')
  const base64 = params.some((param) => param.trim().toLowerCase() === 'base64')
  const declared = (params[0] ?? '').trim()
  const mime = declared === '' ? 'text/plain' : declared
  let charset = ''
  for (const param of params) {
    const eq = param.indexOf('=')
    if (eq > 0 && param.slice(0, eq).trim().toLowerCase() === 'charset') {
      charset = param.slice(eq + 1).trim()
    }
  }

  let bytes: Uint8Array
  if (base64) {
    const cleaned = payload.replace(/\s+/g, '')
    if (cleaned === '') {
      bytes = new Uint8Array(0)
    } else {
      const normalized = cleaned.replace(/-/g, '+').replace(/_/g, '/')
      const padding = (4 - (normalized.length % 4)) % 4
      try {
        bytes = binaryStringToBytes(atob(normalized + '='.repeat(padding)))
      } catch {
        throw new Error('解析失败：base64 部分不是合法的 Base64')
      }
    }
  } else {
    bytes = percentDecode(payload)
  }

  let binary = false
  let content: string
  try {
    content = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    binary = true
    const preview = Array.from(bytes.subarray(0, HEX_PREVIEW_LIMIT), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join(' ')
    content =
      bytes.length > HEX_PREVIEW_LIMIT
        ? `${preview}\n…（仅显示前 ${HEX_PREVIEW_LIMIT} 字节，共 ${bytes.length} 字节）`
        : preview
  }

  return { mime, charset, base64, bytes: bytes.length, binary, content }
}

/** 把解析结果排成可读的几行（内容另起一行，便于多行文本原样展示） */
export function formatParsed(parsed: ParsedDataUrl): string {
  const lines = [
    `MIME 类型: ${parsed.mime}`,
    `字符集: ${parsed.charset === '' ? '未指定' : parsed.charset}`,
    `Base64: ${parsed.base64 ? '是' : '否'}`,
  ]
  if (parsed.binary) {
    lines.push(`提示: 内容共 ${parsed.bytes} 字节，不是合法的 UTF-8 文本，以下为十六进制预览`)
  }
  lines.push('内容:', parsed.content)
  return lines.join('\n')
}

export function transform(input: DataUrlInput, options: DataUrlOptions): string {
  if (input.text === '') return ''
  if (options.direction === 'encode') {
    return encodeDataUrl(input.text, options.mode, options.type)
  }
  return formatParsed(parseDataUrl(input.text))
}
