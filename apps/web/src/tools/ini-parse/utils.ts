import type { IniInput, IniOptions } from './schema'

/**
 * INI ⇄ JSON 互转核心（纯函数，无 React、无 DOM 依赖）。
 *
 * 为什么自己写解析器：规范禁止新增 npm 依赖，而且 INI 从来就不是一个有正式规范的格式
 * （Windows .ini、PHP php.ini、Git config 各有方言）。这里取各家交集：
 * section / key = value / `;` `#` 注释 / 引号值，并给出带行列位置的中文错误。
 */

/** 输入非法或语法不支持时抛出，由 UI 捕获展示 */
export class IniParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IniParseError'
  }
}

/** 解析产物只使用 JSON 能表达的形态 */
export type IniValue = null | boolean | number | string | IniValue[] | { [key: string]: IniValue }

const MAX_INPUT = 1_000_000

/** 统一失败出口：行列位置直接来自原始行号，用户能立刻跳到出错的那一行 */
function fail(line: number, column: number, message: string): never {
  throw new IniParseError(`第 ${line} 行第 ${column} 列：${message}`)
}

// ---------------------------------------------------------------------------
// 词法
// ---------------------------------------------------------------------------

/** 去掉 `;` / `#` 注释：只有在引号外、且位于行首或空白之后才算注释 */
function stripComment(line: string): string {
  let quote: string | null = null
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (quote !== null) {
      if (ch === '\\' && quote === '"') i += 1
      else if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if ((ch === ';' || ch === '#') && (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t')) {
      return line.slice(0, i)
    }
  }
  return line
}

/** 优先按 `=` 切分，没有 `=` 时退而用 `:`（兼容 php.ini 之类用冒号的方言） */
function splitEntry(text: string, line: number): { key: string; value: string } {
  let index = text.indexOf('=')
  if (index === -1) index = text.indexOf(':')
  if (index === -1) fail(line, text.length + 1, '缺少 = 分隔符')
  const key = text.slice(0, index).trim()
  if (key === '') fail(line, 1, '键名为空')
  return { key, value: text.slice(index + 1).trim() }
}

function unquote(raw: string, line: number): string {
  const body = raw.slice(1, -1)
  if (raw[0] === "'") return body.replace(/''/g, "'")
  let out = ''
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    const next = body[i + 1]
    i += 1
    if (next === undefined) fail(line, i, '反斜杠后缺少转义字符')
    if (next === 'n') out += '\n'
    else if (next === 't') out += '\t'
    else if (next === 'r') out += '\r'
    else if (next === '0') out += '\0'
    else out += next
  }
  return out
}

/** INI 本身不区分类型，这里按常见约定还原布尔与数字，其余一律当字符串 */
function resolveValue(raw: string, line: number): IniValue {
  if (raw === '') return ''
  const first = raw[0]
  if (
    (first === '"' && raw[raw.length - 1] === '"') ||
    (first === "'" && raw[raw.length - 1] === "'")
  ) {
    if (raw.length < 2) fail(line, 1, '引号值不合法')
    return unquote(raw, line)
  }
  if (/^true$/i.test(raw)) return true
  if (/^false$/i.test(raw)) return false
  if (/^[-+]?\d+$/.test(raw)) return Number(raw)
  if (/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(raw)) {
    const value = Number(raw)
    if (!Number.isNaN(value)) return value
  }
  return raw
}

// ---------------------------------------------------------------------------
// 解析入口
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, IniValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 带点号的 section 名按嵌套对象展开，保证与 JSON → INI 方向可往返 */
function resolveSection(
  root: Record<string, IniValue>,
  parts: readonly string[],
  line: number,
): Record<string, IniValue> {
  let node: Record<string, IniValue> = root
  for (const part of parts) {
    const next = node[part]
    if (next === undefined) {
      const created: Record<string, IniValue> = {}
      node[part] = created
      node = created
    } else if (isPlainObject(next)) {
      node = next
    } else {
      fail(line, 1, `小节名「${parts.join('.')}」与已存在的标量键冲突`)
    }
  }
  return node
}

export function parseIni(src: string): IniValue {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const root: Record<string, IniValue> = {}
  let current: Record<string, IniValue> = root

  lines.forEach((rawLine, index) => {
    const line = index + 1
    const trimmed = stripComment(rawLine).trim()
    if (trimmed === '') return
    if (trimmed.startsWith('[')) {
      if (!trimmed.endsWith(']')) fail(line, trimmed.length + 1, '小节名缺少 ]')
      const name = trimmed.slice(1, -1).trim()
      if (name === '') fail(line, 2, '小节名为空')
      current = resolveSection(root, name.split('.'), line)
      return
    }
    const { key, value } = splitEntry(trimmed, line)
    current[key] = resolveValue(value, line)
  })

  return root
}

// ---------------------------------------------------------------------------
// JSON → INI
// ---------------------------------------------------------------------------

function needsQuote(text: string): boolean {
  if (text === '') return true
  if (/^\s|\s$/.test(text)) return true
  if (/^["'[]/.test(text)) return true
  return /[;#]/.test(text) || text.includes('\n')
}

function scalarStr(value: IniValue, line: number): string {
  if (value === null) throw new IniParseError('INI 没有 null，请先去掉值为 null 的键')
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (typeof value === 'string') return needsQuote(value) ? JSON.stringify(value) : value
  throw new IniParseError(`第 ${line} 行：数组或对象不能直接作为 INI 的值`)
}

function writeBody(obj: Record<string, IniValue>, path: readonly string[], out: string[]): void {
  const entries: string[] = []
  const sections: [string, Record<string, IniValue>][] = []

  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (isPlainObject(value)) {
      sections.push([key, value])
      continue
    }
    if (Array.isArray(value)) {
      // INI 没有数组类型：按常见做法重复输出同名键
      if (!value.every((item) => item === null || typeof item !== 'object')) {
        throw new IniParseError(`键「${key}」是对象数组，INI 无法表达`)
      }
      for (const item of value) entries.push(`${key} = ${scalarStr(item, out.length + 1)}`)
      continue
    }
    entries.push(`${key} = ${scalarStr(value, out.length + 1)}`)
  }

  out.push(...entries)
  for (const [key, section] of sections) {
    const next = [...path, key]
    out.push('')
    out.push(`[${next.join('.')}]`)
    writeBody(section, next, out)
  }
}

/** JSON → INI：顶层必须是对象，因为 INI 文档的根就是若干小节 */
export function toIni(value: unknown): string {
  if (!isPlainObject(value)) {
    throw new IniParseError('JSON 顶层必须是对象，才能转成 INI')
  }
  const out: string[] = []
  writeBody(value as Record<string, IniValue>, [], out)
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '')
}

// ---------------------------------------------------------------------------
// 对外入口
// ---------------------------------------------------------------------------

/**
 * INI ⇄ JSON 互转。
 * 空输入返回空串（UI 需要区分「没输入」与「解析失败」）；
 * 语法不支持或 JSON 非法时抛中文错误，而不是输出半截结果。
 */
export function transform(input: IniInput, options: IniOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new IniParseError('输入超过 1,000,000 字符上限')
  }
  if (options.direction === 'ini2json') {
    return JSON.stringify(parseIni(input.text), null, Number(options.indent))
  }
  let data: unknown
  try {
    data = JSON.parse(input.text)
  } catch {
    throw new IniParseError('不是合法的 JSON，无法转换为 INI')
  }
  return toIni(data)
}
