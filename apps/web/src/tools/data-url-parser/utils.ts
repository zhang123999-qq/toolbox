import type { DataUrlParserInput, DataUrlParserOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class DataUrlParserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DataUrlParserError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 2_000_000

/** 十六进制转储的最大字节数：再多的二进制预览没有可读性，交给专用二进制查看工具 */
const HEX_LIMIT = 4096

/** RFC 2397 的缺省媒体类型：没有显式声明时按纯文本处理 */
const DEFAULT_MEDIA_TYPE = 'text/plain'

/** Data URL 的前缀（大小写不敏感） */
const PREFIX = /^data:/i

/** Base64 载荷允许出现的字符（含 URL 安全变体），用于在调 atob 之前先自检 */
const BASE64_BODY = /^[A-Za-z0-9+/_-]*={0,2}$/

/** 解析出来的一个 `;参数` 项 */
export interface UrlParameter {
  readonly name: string
  readonly value: string
}

/** 解析结果 */
export interface ParsedDataUrl {
  /** 含参数的完整媒体类型 */
  readonly mediaType: string
  /** 去掉参数的 `type/subtype` */
  readonly essence: string
  /** 除第一项外的 `;参数` 列表（base64 标志单独见于 `base64`） */
  readonly parameters: readonly UrlParameter[]
  readonly base64: boolean
  /** 声明的 charset 参数，未声明为空串 */
  readonly charset: string
  readonly byteLength: number
  /** 载荷是否无法按 UTF-8 解成文本 */
  readonly binary: boolean
  /** 文本结果；二进制时为空串 */
  readonly text: string
  /** 解码出的原始字节 */
  readonly bytes: Uint8Array
}

/** 千分位整数 */
function group(value: number): string {
  return value.toLocaleString('en-US')
}

/** 十六进制转储（小写、空格分隔），超过上限则截断并附说明 */
export function hexDump(bytes: Uint8Array, limit = HEX_LIMIT): string {
  const shown = bytes.subarray(0, Math.min(bytes.length, limit))
  const lines: string[] = []
  for (const byte of shown) lines.push(byte.toString(16).padStart(2, '0'))
  const body = lines.join(' ')
  return bytes.length > limit
    ? `${body}\n…（仅显示前 ${group(limit)} 字节，共 ${group(bytes.length)} 字节）`
    : body
}

/**
 * 百分号解码（RFC 2397 的非 base64 分支）。
 * 未转义的非 ASCII 字符按 UTF-8 补字节：从网页里复制出来的 URL 常有一部分没转义，
 * 直接按 latin1 截断会丢内容。
 */
export function percentDecode(payload: string): Uint8Array {
  const bytes: number[] = []
  for (let i = 0; i < payload.length; i += 1) {
    const ch = payload[i] ?? ''
    if (ch === '%') {
      const hex = payload.slice(i + 1, i + 3)
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        throw new DataUrlParserError(
          `解析失败：百分号转义不完整，应为 %XX，实际是“%${hex === '' ? '（结尾）' : hex}”`,
        )
      }
      bytes.push(Number.parseInt(hex, 16))
      i += 2
      continue
    }
    if (ch.codePointAt(0)! > 0x7f) {
      bytes.push(...new TextEncoder().encode(ch))
      continue
    }
    bytes.push(ch.charCodeAt(0))
  }
  return Uint8Array.from(bytes)
}

/** Base64 解码：容忍换行、URL 安全变体与缺失的填充 */
export function base64Decode(payload: string): Uint8Array {
  const cleaned = payload.replace(/\s+/g, '')
  if (cleaned === '') return new Uint8Array(0)
  if (!BASE64_BODY.test(cleaned)) {
    throw new DataUrlParserError('解析失败：Base64 部分含有非法字符')
  }
  const normalized = cleaned.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  let binary: string
  try {
    binary = atob(normalized + '='.repeat(padding))
  } catch {
    throw new DataUrlParserError('解析失败：Base64 部分长度不合法')
  }
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** 严格 UTF-8 解码：解不出就是二进制，返回 null（不用 replacement mode 吞掉错误字节） */
export function utf8Text(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** 切出 `type/subtype` 与其余参数 */
function splitMeta(metaPart: string): {
  essence: string
  parameters: readonly UrlParameter[]
  base64: boolean
} {
  const segments = metaPart.split(';')
  const essence = (segments[0] ?? '').trim().toLowerCase() || DEFAULT_MEDIA_TYPE
  const parameters: UrlParameter[] = []
  let base64 = false
  for (const segment of segments.slice(1)) {
    const item = segment.trim()
    if (item === '') continue
    const eq = item.indexOf('=')
    if (eq < 0) {
      // 没有 `=` 的裸标记只有 base64 一种合法用法
      if (item.toLowerCase() === 'base64') base64 = true
      else parameters.push({ name: item.toLowerCase(), value: '' })
      continue
    }
    parameters.push({
      name: item.slice(0, eq).trim().toLowerCase(),
      value: item.slice(eq + 1).trim(),
    })
  }
  return { essence, parameters, base64 }
}

/**
 * 解析 Data URL（RFC 2397）。
 * 与 `data-url` 工具的区别：那里侧重「生成」，这里只做解析，
 * 并把参数、字节数、是否二进制都摊开给使用者。
 */
export function parseDataUrl(raw: string): ParsedDataUrl {
  const source = raw.trim()
  if (!PREFIX.test(source)) {
    throw new DataUrlParserError('解析失败：输入不是 Data URL，应以 data: 开头')
  }
  const body = source.slice('data:'.length)
  const comma = body.indexOf(',')
  if (comma < 0) {
    throw new DataUrlParserError('解析失败：Data URL 缺少分隔元信息与内容的逗号')
  }
  const metaPart = body.slice(0, comma)
  const payload = body.slice(comma + 1)

  const { essence, parameters, base64 } = splitMeta(metaPart)
  const bytes = base64 ? base64Decode(payload) : percentDecode(payload)
  const charset = parameters.find((item) => item.name === 'charset')?.value ?? ''
  const text = utf8Text(bytes)

  const mediaType =
    parameters.length === 0
      ? essence
      : [
          essence,
          ...parameters.map((item) =>
            item.value === '' ? item.name : `${item.name}=${item.value}`,
          ),
        ].join(';')

  return {
    mediaType,
    essence,
    parameters,
    base64,
    charset,
    byteLength: bytes.length,
    binary: text === null,
    text: text ?? '',
    bytes,
  }
}

/** 参数列表排进一行 */
function parametersLine(parsed: ParsedDataUrl): string {
  if (parsed.parameters.length === 0) return '（无）'
  return parsed.parameters
    .map((item) => (item.value === '' ? item.name : `${item.name}=${item.value}`))
    .join('; ')
}

/** 可读报告：逐项摊平，正文另起一段 */
export function formatReport(parsed: ParsedDataUrl): string {
  const lines = [
    `媒体类型: ${parsed.mediaType}`,
    `主类型: ${parsed.essence}`,
    `参数: ${parametersLine(parsed)}`,
    `编码方式: ${parsed.base64 ? 'Base64' : '百分号编码'}`,
    `字节数: ${group(parsed.byteLength)} 字节`,
    `声明字符集: ${parsed.charset === '' ? '（未声明）' : parsed.charset}`,
    `内容形态: ${parsed.binary ? '二进制（不是合法的 UTF-8 文本）' : '文本（合法 UTF-8）'}`,
    '',
  ]
  if (parsed.binary) {
    lines.push('内容（十六进制转储）:', hexDump(parsed.bytes))
  } else {
    lines.push('内容:', parsed.text)
  }
  return lines.join('\n')
}

/** JSON 结果：二进制时不塞文本，改给 hex 预览 */
export function formatJson(parsed: ParsedDataUrl): string {
  const payload: Record<string, unknown> = {
    mediaType: parsed.mediaType,
    essence: parsed.essence,
    charset: parsed.charset,
    base64: parsed.base64,
    byteLength: parsed.byteLength,
    binary: parsed.binary,
  }
  const parameters: Record<string, string> = {}
  for (const item of parsed.parameters) parameters[item.name] = item.value
  payload.parameters = parameters
  if (parsed.binary) payload.hex = hexDump(parsed.bytes)
  else payload.text = parsed.text
  return JSON.stringify(payload, null, 2)
}

/** 只要还原出的正文；二进制内容退化为十六进制转储 */
export function formatRaw(parsed: ParsedDataUrl): string {
  return parsed.binary ? hexDump(parsed.bytes) : parsed.text
}

/**
 * Data URL 解析 —— 纯函数，不依赖 React / DOM，可独立单测。
 * 空输入返回空串；超长输入按此项目的统一口径抛错。
 */
export function transform(input: DataUrlParserInput, options: DataUrlParserOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new DataUrlParserError('输入超过 2,000,000 字符上限')
  }

  const parsed = parseDataUrl(input.text)
  if (options.format === 'json') return formatJson(parsed)
  if (options.format === 'raw') return formatRaw(parsed)
  return formatReport(parsed)
}
