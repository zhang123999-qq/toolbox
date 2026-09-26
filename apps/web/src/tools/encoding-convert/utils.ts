import type { EncodingConvertInput, EncodingConvertOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class EncodingConvertError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EncodingConvertError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 500_000

/** 支持的字符集；顺序即下拉框里的顺序 */
export const SUPPORTED_ENCODINGS = [
  'utf-8',
  'utf-16le',
  'utf-16be',
  'gbk',
  'gb18030',
  'big5',
  'shift_jis',
  'euc-jp',
  'euc-kr',
  'iso-8859-1',
  'windows-1252',
  'koi8-r',
] as const

// ---------------------------------------------------------------------------
// 字节 ↔ 文本串（十六进制 / Base64 / Latin-1）
// ---------------------------------------------------------------------------

/**
 * 把字节排成十六进制串（小写、无分隔符）。
 * 无分隔符便于直接粘进代码里的字节数组或 HTTP 报文。
 */
export function toHex(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += byte.toString(16).padStart(2, '0')
  return out
}

/** 字节排成 Base64（分块拼 btoa 能吃的 latin1 串，避免一次展开过长导致栈溢出） */
export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/** 字节排成「一个字符 = 一个字节」的串：正是多个工具认的乱码形态 */
export function toLatin1(bytes: Uint8Array): string {
  let out = ''
  for (const byte of bytes) out += String.fromCharCode(byte)
  return out
}

/** 按选项把字节写成字符串 */
export function formatBytes(bytes: Uint8Array, format: string): string {
  if (format === 'base64') return toBase64(bytes)
  if (format === 'latin1') return toLatin1(bytes)
  return toHex(bytes)
}

/** 从十六进制串还原字节：允许空格分隔与 0x 前缀，但必须凑满两位一组 */
export function parseHex(text: string): Uint8Array {
  const cleaned = text.replace(/^0x/i, '').replace(/[\s:_,-]/g, '')
  if (cleaned === '') return new Uint8Array(0)
  if (!/^[0-9a-fA-F]+$/.test(cleaned)) {
    throw new EncodingConvertError('不是合法的十六进制：只接受 0-9 / a-f，其余字符请先去掉')
  }
  if (cleaned.length % 2 !== 0) {
    throw new EncodingConvertError(
      `十六进制长度必须是偶数（每 2 位一个字节），当前 ${cleaned.length} 位`,
    )
  }
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(cleaned.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** 从 Base64 还原字节：容忍换行与 URL 安全变体 */
export function parseBase64(text: string): Uint8Array {
  const cleaned = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (cleaned === '') return new Uint8Array(0)
  const body = cleaned.replace(/=+$/, '')
  if (body.length % 4 === 1 || !/^[A-Za-z0-9+/]+$/.test(body)) {
    throw new EncodingConvertError('不是合法的 Base64：含有非法字符或长度不对')
  }
  let binary: string
  try {
    binary = atob(cleaned)
  } catch {
    throw new EncodingConvertError('不是合法的 Base64：含有非法字符或长度不对')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 从 latin1 串还原字节：出现大于 U+00FF 的码位说明这个串不是字节串 */
export function parseLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    if (code > 0xff) {
      throw new EncodingConvertError(
        '第 ' +
          (i + 1) +
          ' 个字符“' +
          (text[i] ?? '') +
          '”的码位大于 U+00FF，不是单字节的乱码串；请改用 hex 或 base64 形式',
      )
    }
    bytes[i] = code
  }
  return bytes
}

/** 按选项把文本还原成字节 */
export function parseInput(text: string, format: string): Uint8Array {
  if (format === 'base64') return parseBase64(text)
  if (format === 'latin1') return parseLatin1(text)
  return parseHex(text)
}

// ---------------------------------------------------------------------------
// 解码（字节 → 文本）
// ---------------------------------------------------------------------------

/** 构造 TextDecoder 失败就是「环境不支持该编码」，据此给中文报错 */
function ensureSupported(encoding: string): TextDecoder {
  try {
    return new TextDecoder(encoding)
  } catch {
    throw new EncodingConvertError(
      `不支持的编码：${encoding}（当前运行环境的 TextDecoder 未提供该字符集）。` +
        `可选：${SUPPORTED_ENCODINGS.join('、')}`,
    )
  }
}

/** 字节按指定字符集解成文本 */
export function decodeBytes(bytes: Uint8Array, encoding: string): string {
  return ensureSupported(encoding).decode(bytes)
}

// ---------------------------------------------------------------------------
// 编码（文本 → 字节）：借助原生解码器反推字符集表
// ---------------------------------------------------------------------------

/** 每个字符集的反向表缓存；同一字符集只反推一次 */
const encoderCache = new Map<string, Map<string, Uint8Array>>()

/** UTF-16 直接按码元写字节，不需要表 */
function encodeUtf16(text: string, littleEndian: boolean): Uint8Array {
  const bytes = new Uint8Array(text.length * 2)
  for (let i = 0; i < text.length; i += 1) {
    const unit = text.charCodeAt(i)
    if (littleEndian) {
      bytes[i * 2] = unit & 0xff
      bytes[i * 2 + 1] = unit >>> 8
    } else {
      bytes[i * 2] = unit >>> 8
      bytes[i * 2 + 1] = unit & 0xff
    }
  }
  return bytes
}

/**
 * 反推一个字符集的「字符 → 字节」表。
 *
 * 浏览器只提供 解码 器（TextDecoder），TextEncoder 固定只做 UTF-8，
 * 单靠原生 API 是没法把中文编成 GBK 字节的。这里的做法是枚举所有单字节与
 * 双字节序列，用解码器问出每个序列对应的字符，反过来建立映射——
 * 不引入任何码表依赖，也不必 fork iconv-lite。代价是一次性 ~2.5 万次解码（约十几毫秒），
 * 因此结果按字符集缓存。
 */
function buildEncoderTable(encoding: string): Map<string, Uint8Array> {
  const decoder = ensureSupported(encoding)
  const table = new Map<string, Uint8Array>()

  const remember = (bytes: Uint8Array): void => {
    const text = decoder.decode(bytes)
    if (text === '') return
    // 只收「一整个字符」：长度 1，或恰好是一对代理项（非 BMP 字符）
    const paired = /^[\uD800-\uDBFF][\uDC00-\uDFFF]$/.test(text)
    if (text.length > 2 || (text.length === 2 && !paired)) return
    if (text.includes('\uFFFD')) return
    if (table.has(text)) return
    table.set(text, bytes.slice())
  }

  for (let byte = 0; byte <= 0xff; byte += 1) remember(Uint8Array.of(byte))
  const pair = new Uint8Array(2)
  for (let lead = 0x81; lead <= 0xfe; lead += 1) {
    for (let trail = 0x40; trail <= 0xfe; trail += 1) {
      if (trail === 0x7f) continue
      pair[0] = lead
      pair[1] = trail
      remember(pair)
    }
  }
  return table
}

/** 取（并缓存）字符集的反向表 */
export function encoderTable(encoding: string): ReadonlyMap<string, Uint8Array> {
  const cached = encoderCache.get(encoding)
  if (cached) return cached
  const table = buildEncoderTable(encoding)
  encoderCache.set(encoding, table)
  return table
}

/** 文本按指定字符集编成字节；字符集里没有的字符一律报错（不做静默替换） */
export function encodeText(text: string, encoding: string): Uint8Array {
  if (encoding === 'utf-8') return new TextEncoder().encode(text)
  if (encoding === 'utf-16le') return encodeUtf16(text, true)
  if (encoding === 'utf-16be') return encodeUtf16(text, false)

  const table = encoderTable(encoding)
  const out: number[] = []
  const missing: string[] = []
  for (const char of text) {
    const bytes = table.get(char)
    if (bytes === undefined) {
      if (missing.length < 3) missing.push(char)
      continue
    }
    out.push(...bytes)
  }
  if (missing.length > 0) {
    throw new EncodingConvertError(
      `字符集 ${encoding} 里没有这些字符：${missing.join('、')}。` +
        '请改用 utf-8 / gb18030 这类覆盖更广的字符集，或先把字符替换掉',
    )
  }
  return Uint8Array.from(out)
}

// ---------------------------------------------------------------------------
// 入口
// ---------------------------------------------------------------------------

/**
 * 编码转换 —— 纯函数，不依赖 React / DOM（用的是 WHATWG 编码标准的 TextDecoder/TextEncoder），
 * 可独立单测。空输入返回空串；超长输入按此项目的统一口径抛错。
 */
export function transform(input: EncodingConvertInput, options: EncodingConvertOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new EncodingConvertError('输入超过 500,000 字符上限')
  }
  ensureSupported(options.encoding)

  if (options.direction === 'encode') {
    return formatBytes(encodeText(input.text, options.encoding), options.format)
  }
  // decode：字节侧的写法由 format 决定，还原出来的文本一律按 UTF-8 输出
  return decodeBytes(parseInput(input.text.trim(), options.format), options.encoding)
}
