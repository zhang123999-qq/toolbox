import type { PropertiesInput, PropertiesOptions } from './schema'

/**
 * Java Properties ⇄ JSON 互转核心（纯函数，无 React、无 DOM 依赖）。
 *
 * 为什么自己写解析器：规范禁止新增 npm 依赖。Properties 的规则不算复杂但细节很多
 * （`\` 续行、`\uXXXX` 转义、`!` `#` 注释、`=` `:` 空白三种分隔符），
 * 这里按 java.util.Properties 的语义实现主要部分，差异与缺口写在 README「限制」里。
 */

/** 输入非法或语法不支持时抛出，由 UI 捕获展示 */
export class PropertiesParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PropertiesParseError'
  }
}

/** Properties 的值类型只有字符串，解析产物固定为 string → string 的映射 */
export type PropertiesMap = Record<string, string>

const MAX_INPUT = 1_000_000

/** 统一失败出口：行列位置直接来自原始行号，用户能立刻跳到出错的那一行 */
function fail(line: number, column: number, message: string): never {
  throw new PropertiesParseError(`第 ${line} 行第 ${column} 列：${message}`)
}

interface LogicalLine {
  readonly line: number
  readonly text: string
}

function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\f' || ch === '\r'
}

/** 行尾反斜杠个数为奇数时表示续行（Java 的规定：\\ 表示字面反斜杠，不续行） */
function endsWithOddBackslash(text: string): boolean {
  let count = 0
  for (let i = text.length - 1; i >= 0 && text[i] === '\\'; i -= 1) count += 1
  return count % 2 === 1
}

/** 把续行合并成逻辑行；续行开头的空白按 Java 语义丢弃 */
function joinLogicalLines(raw: readonly string[]): LogicalLine[] {
  const out: LogicalLine[] = []
  let i = 0
  while (i < raw.length) {
    const line = i + 1
    let text = raw[i]
    while (endsWithOddBackslash(text) && i + 1 < raw.length) {
      i += 1
      text = text.slice(0, -1) + raw[i].replace(/^[ \t\f]+/, '')
    }
    out.push({ line, text })
    i += 1
  }
  return out
}

/** 还原 `\n` `\t` `\r` `\f` `\uXXXX` 等转义；未定义的 `\c` 按 Java 规则取 c 本身 */
function unescape(text: string, line: number): string {
  let out = ''
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch !== '\\') {
      out += ch
      i += 1
      continue
    }
    const next = text[i + 1]
    if (next === undefined) break
    i += 2
    if (next === 'n') out += '\n'
    else if (next === 't') out += '\t'
    else if (next === 'r') out += '\r'
    else if (next === 'f') out += '\f'
    else if (next === 'u') {
      const hex = text.slice(i, i + 4)
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
        fail(line, i, '\\u 转义需要 4 位十六进制')
      }
      out += String.fromCharCode(Number.parseInt(hex, 16))
      i += 4
    } else out += next
  }
  return out
}

/**
 * 按 Properties 规则切分键与值：
 * 键一直读到第一个未转义的 `=` / `:` / 空白，之后跳过分隔符与空白才是值。
 */
function splitEntry(text: string): { key: string; value: string } {
  const n = text.length
  let i = 0
  while (i < n && isSpace(text[i])) i += 1
  let key = ''
  let j = i
  while (j < n) {
    const ch = text[j]
    if (ch === '\\') {
      key += text.slice(j, j + 2)
      j += 2
      continue
    }
    if (ch === '=' || ch === ':' || isSpace(ch)) break
    key += ch
    j += 1
  }
  // 分隔符前后都允许有空白（Java 的语义：空白 → 分隔符 → 空白 都属于分隔部分）
  let k = j
  while (k < n && isSpace(text[k])) k += 1
  if (k < n && (text[k] === '=' || text[k] === ':')) k += 1
  while (k < n && isSpace(text[k])) k += 1
  return { key, value: text.slice(k) }
}

export function parseProperties(src: string): PropertiesMap {
  const lines = joinLogicalLines(src.replace(/\r\n?/g, '\n').split('\n'))
  const out: PropertiesMap = {}
  for (const logical of lines) {
    const text = logical.text
    let i = 0
    while (i < text.length && isSpace(text[i])) i += 1
    if (i >= text.length) continue
    if (text[i] === '#' || text[i] === '!') continue
    const { key, value } = splitEntry(text)
    out[unescape(key, logical.line)] = unescape(value, logical.line)
  }
  return out
}

// ---------------------------------------------------------------------------
// JSON → Properties
// ---------------------------------------------------------------------------

function escapeChar(ch: string): string {
  if (ch === '\n') return '\\n'
  if (ch === '\t') return '\\t'
  if (ch === '\r') return '\\r'
  if (ch === '\f') return '\\f'
  return ch
}

/** 键必须转义 `=` `:` `\` 与空白，否则读回来会被当成分隔符 */
function escapeKey(key: string): string {
  let out = ''
  for (const ch of key) {
    if (ch === '=' || ch === ':' || ch === '\\') out += `\\${ch}`
    else if (isSpace(ch)) out += `\\${ch}`
    else out += ch
  }
  return out
}

function escapeValue(value: string, unicodeEscape: boolean): string {
  let out = ''
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    // 首字符是空格时要转义，否则读回来会被当作分隔符周围的空白丢掉
    if (ch === '=' || ch === ':' || ch === '\\' || (ch === ' ' && out === '')) {
      out += `\\${ch}`
      continue
    }
    if (unicodeEscape && code > 0x7f) {
      out += `\\u${code.toString(16).padStart(4, '0')}`
      continue
    }
    out += escapeChar(ch)
  }
  return out
}

/** JSON → Properties：值只接受标量，null / 数组 / 对象在 Properties 里都没有对应写法 */
export function toProperties(value: unknown, unicodeEscape: boolean): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new PropertiesParseError('JSON 顶层必须是对象，才能转成 Properties')
  }
  const record = value as Record<string, unknown>
  const out: string[] = []
  for (const key of Object.keys(record)) {
    const item = record[key]
    if (item === null) {
      throw new PropertiesParseError(`键「${key}」的值是 null，Properties 无法表达`)
    }
    if (typeof item === 'object') {
      throw new PropertiesParseError(`键「${key}」的值是数组或对象，Properties 无法表达`)
    }
    out.push(`${escapeKey(key)}=${escapeValue(String(item), unicodeEscape)}`)
  }
  return out.join('\n')
}

// ---------------------------------------------------------------------------
// 对外入口
// ---------------------------------------------------------------------------

/**
 * Java Properties ⇄ JSON 互转。
 * 空输入返回空串（UI 需要区分「没输入」与「解析失败」）；
 * 输入非法时抛中文错误，而不是输出半截结果。
 */
export function transform(input: PropertiesInput, options: PropertiesOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new PropertiesParseError('输入超过 1,000,000 字符上限')
  }
  if (options.direction === 'props2json') {
    return JSON.stringify(parseProperties(input.text), null, Number(options.indent))
  }
  let data: unknown
  try {
    data = JSON.parse(input.text)
  } catch {
    throw new PropertiesParseError('不是合法的 JSON，无法转换为 Properties')
  }
  return toProperties(data, options.encoding === 'escaped')
}
