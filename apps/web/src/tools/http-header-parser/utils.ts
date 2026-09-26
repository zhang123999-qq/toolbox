import type { HttpHeaderInput, HttpHeaderOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class HttpHeaderParserError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HttpHeaderParserError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 200_000

/** 一个字段；同名重复时保留多行，HTTP 语义下不允许随意合并（Set-Cookie 尤其如此） */
export interface HeaderEntry {
  readonly name: string
  readonly value: string
}

/** 请求的起始行：`GET /index.html HTTP/1.1` */
const REQUEST_LINE = /^[A-Za-z]+[ \t]+\S+[ \t]+HTTP\/\d(?:\.\d)?$/i

/** 响应的状态行：`HTTP/1.1 200 OK` */
const STATUS_LINE = /^HTTP\/\d(?:\.\d)?[ \t]+\d{3}(?:[ \t].*)?$/i

/** 解析结果：起始行 + 按原顺序排列的字段列表 */
export interface ParsedHeaders {
  /** 请求行或状态行；没有就为空串 */
  readonly startLine: string
  readonly kind: 'request' | 'response' | 'unknown'
  readonly headers: readonly HeaderEntry[]
}

/** 按 `\r\n` / `\n` / `\r` 三种换行切行，避免 Mac 老文本整段被当成一行 */
export function splitLines(text: string): string[] {
  return text.split(/\r\n|\r|\n/)
}

/**
 * 判断一行是不是「请求行 / 状态行」。
 * 只有紧跟在开头且不与下一个字段行冲突时才算，否则 `Host: example.com` 这类
 * 以 `Get` 开头也无所谓，但 `HTTP: x` 这种字段名不能被误判成状态行 —— 故要求带 /。
 */
function detectStartLine(line: string): ParsedHeaders['kind'] {
  if (REQUEST_LINE.test(line)) return 'request'
  if (STATUS_LINE.test(line)) return 'response'
  return 'unknown'
}

/**
 * 把原始头文本拆成结构化字段。
 * 处理三类现实输入：CRLF 换行、obsolete 折行（行首空格续接上一行的值）、
 * 以及 CRLF CRLF 之后的正文（遇到空行即停，正文不当作头字段）。
 */
export function parseHeaders(text: string): ParsedHeaders {
  const rawLines = splitLines(text)
  const headers: HeaderEntry[] = []

  let index = 0
  // 跳过开头的空行：从 curl -v 之类的日志里粘出来的片段头部常带空行
  while (index < rawLines.length && rawLines[index]?.trim() === '') index += 1

  const firstLine = rawLines[index] ?? ''
  const kind = detectStartLine(firstLine)
  const startLine = kind === 'unknown' ? '' : firstLine.trim()
  if (kind !== 'unknown') index += 1

  for (; index < rawLines.length; index += 1) {
    const line = rawLines[index] ?? ''
    // 空行出现在字段之后意味着头结束、正文开始
    if (line.trim() === '') break
    // 折行：RFC 7230 已废弃但线上依然存在，按 1 个空格接到上一行的值后面
    if (/^[ \t]/.test(line) && headers.length > 0) {
      const previous = headers[headers.length - 1]
      if (previous) {
        headers[headers.length - 1] = {
          name: previous.name,
          value: previous.value + ' ' + line.trim(),
        }
      }
      continue
    }
    const colon = line.indexOf(':')
    if (colon <= 0) {
      // 头区域里出现既不含冒号、又不是折行的行，说明这段东西不是 HTTP 头
      throw new HttpHeaderParserError(
        `未找到「名称: 值」形式的头字段：第 ${index + 1} 行“${truncate(line)}”缺少冒号`,
      )
    }
    const name = line.slice(0, colon).trim()
    if (name === '') {
      throw new HttpHeaderParserError(`第 ${index + 1} 行的头字段名称为空`)
    }
    headers.push({ name, value: line.slice(colon + 1).trim() })
  }

  if (headers.length === 0 && startLine === '') {
    throw new HttpHeaderParserError(
      '不是合法的 HTTP 头：既没有起始行，也没有「名称: 值」形式的字段',
    )
  }
  return { startLine, kind, headers }
}

/** 超长片段截断后再进报错文案，避免整行正文刷屏 */
function truncate(text: string): string {
  const value = text.trim()
  return value.length > 40 ? value.slice(0, 40) + '…' : value
}

/** 统计同名重复：合计字段数之外再看哪些名字出现了多次 */
export function duplicatedNames(headers: readonly HeaderEntry[]): readonly string[] {
  const counts = new Map<string, number>()
  for (const header of headers) counts.set(header.name, (counts.get(header.name) ?? 0) + 1)
  return [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
}

/** 解析结果排成可读文本：字段名右对齐，最后附一行统计 */
export function formatParsedText(parsed: ParsedHeaders): string {
  const lines: string[] = []
  if (parsed.startLine !== '') lines.push('起始行: ' + parsed.startLine)

  const width = parsed.headers.reduce((max, header) => Math.max(max, header.name.length), 0)
  for (const header of parsed.headers) {
    lines.push(header.name.padEnd(width, ' ') + ': ' + header.value)
  }

  const duplicated = duplicatedNames(parsed.headers)
  const summary =
    `共 ${parsed.headers.length} 个字段` +
    (duplicated.length > 0 ? `，重复出现的名称：${duplicated.join('、')}` : '')
  lines.push('')
  lines.push(summary)
  return lines.join('\n')
}

/** 解析结果排成 JSON，便于直接喂给其它工具或测试用例 */
export function formatParsedJson(parsed: ParsedHeaders): string {
  const payload = {
    startLine: parsed.startLine,
    kind: parsed.kind,
    count: parsed.headers.length,
    headers: parsed.headers.map((header) => ({ name: header.name, value: header.value })),
  }
  return JSON.stringify(payload, null, 2)
}

/** 把 JSON（对象 / 数组 / 解析回环三种写法）转成待拼装的字段列表 */
function entriesFromJson(value: unknown): readonly HeaderEntry[] {
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      const record = item as Record<string, unknown>
      const name = typeof record?.name === 'string' ? record.name : ''
      const rawValue = record?.value
      if (name === '') throw new HttpHeaderParserError(`第 ${index + 1} 项的字段名称不是字符串`)
      return { name, value: stringifyValue(rawValue) }
    })
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    // 解析输出的回环：{"startLine": "...", "headers": [...]}
    if (Array.isArray(record.headers)) return entriesFromJson(record.headers)
    const out: HeaderEntry[] = []
    for (const [name, rawValue] of Object.entries(record)) {
      if (Array.isArray(rawValue)) {
        for (const item of rawValue) out.push({ name, value: stringifyValue(item) })
      } else {
        out.push({ name, value: stringifyValue(rawValue) })
      }
    }
    return out
  }
  throw new HttpHeaderParserError('构建失败：JSON 顶层必须是对象或数组')
}

/** 非字符串取值统一按「JSON 原样写回」处理，避免布尔true 变成 "TRUE" */
function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

/** 提取可选的起始行：既可能是 abuild 输入的字段，也可能是手写文本的首行 */
function startLineOf(record: Record<string, unknown>): string {
  return typeof record.startLine === 'string' ? record.startLine.trim() : ''
}

/** 由键值对生成头文本（用 \n 连接；需要 CRLF 的场景再自行替换） */
export function buildHeaders(input: string, format: string): string {
  const lines: string[] = []
  let startLine = ''

  if (format === 'json') {
    let parsed: unknown
    try {
      parsed = JSON.parse(input)
    } catch {
      throw new HttpHeaderParserError('构建失败：输入不是合法的 JSON')
    }
    const entries = entriesFromJson(parsed)
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      startLine = startLineOf(parsed as Record<string, unknown>)
    }
    for (const entry of entries) lines.push(`${entry.name}: ${entry.value}`)
  } else {
    const rawLines = splitLines(input)
    // 起始行优先：请求行 / 状态行里没有冒号，若当作普通行处理会误报「缺少冒号」
    const firstIndex = rawLines.findIndex(
      (line) => line.trim() !== '' && !line.trim().startsWith('#'),
    )
    const first = firstIndex >= 0 ? (rawLines[firstIndex] ?? '').trim() : ''
    let consumed = -1
    // 起始行优先：请求行 / 状态行里没有冒号，若当作普通行处理会误报「缺少冒号」。
    // 只有确实识别成起始行时才跳过该行，否则它仍是一个普通的 `名称: 值` 行。
    if (detectStartLine(first) !== 'unknown') {
      startLine = first
      consumed = firstIndex
    }

    rawLines.forEach((line, index) => {
      if (index === consumed) return
      const trimmed = line.trim()
      if (trimmed === '' || trimmed.startsWith('#')) return
      const colon = trimmed.indexOf(':')
      if (colon <= 0) {
        throw new HttpHeaderParserError(
          `构建失败：第 ${index + 1} 行“${truncate(trimmed)}”不是「名称: 值」形式`,
        )
      }
      lines.push(`${trimmed.slice(0, colon).trim()}: ${trimmed.slice(colon + 1).trim()}`)
    })
  }

  if (lines.length === 0 && startLine === '') {
    throw new HttpHeaderParserError('构建失败：没有解析出任何头字段')
  }
  const out = startLine === '' ? [] : [startLine]
  out.push(...lines)
  return out.join('\n')
}

/**
 * HTTP 头解析 / 生成 —— 纯函数，不依赖 React / DOM，可独立单测。
 * 空输入返回空串；超长输入按此项目的统一口径抛错。
 */
export function transform(input: HttpHeaderInput, options: HttpHeaderOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new HttpHeaderParserError('输入超过 200,000 字符上限')
  }

  if (options.direction === 'build') return buildHeaders(input.text, options.format)

  const parsed = parseHeaders(input.text)
  return options.format === 'json' ? formatParsedJson(parsed) : formatParsedText(parsed)
}
