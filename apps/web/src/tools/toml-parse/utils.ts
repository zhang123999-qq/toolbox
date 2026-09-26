import type { TomlInput, TomlOptions } from './schema'

/**
 * TOML ⇄ JSON 互转核心（纯函数，无 React、无 DOM 依赖）。
 *
 * 为什么自己写解析器：规范禁止新增 npm 依赖，因此这里实现 TOML 1.0 的一个子集
 * （表 / 数组表 / 内联表 / 数组 / 四类字符串 / 整数浮点 / 日期时间），
 * 覆盖 Cargo.toml、pyproject.toml 这类日常配置的绝大多数写法；
 * 不合法的输入一律抛带行列位置的中文错误，而不是静默产出错误结果。
 */

/** 输入非法或语法不支持时抛出，由 UI 捕获展示 */
export class TomlParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TomlParseError'
  }
}

/** 解析产物只使用 JSON 能表达的形态：日期时间退化为字符串以便原样往返 */
export type TomlValue =
  null | boolean | number | string | TomlValue[] | { [key: string]: TomlValue }

const MAX_INPUT = 1_000_000

/** 统一失败出口：行列位置直接来自原始行号，用户能立刻跳到出错的那一行 */
function fail(line: number, column: number, message: string): never {
  throw new TomlParseError(`第 ${line} 行第 ${column} 列：${message}`)
}

interface Cursor {
  i: number
}

interface Stmt {
  readonly line: number
  readonly text: string
}

const BASIC_ESCAPES: Record<string, string> = {
  b: '\b',
  t: '\t',
  n: '\n',
  f: '\f',
  r: '\r',
  '"': '"',
  '\\': '\\',
}

const RE_OFFSET_DT = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/
const RE_LOCAL_DT = /^\d{4}-\d{2}-\d{2}[Tt ]\d{2}:\d{2}:\d{2}(\.\d+)?$/
const RE_LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/
const RE_LOCAL_TIME = /^\d{2}:\d{2}:\d{2}(\.\d+)?$/

// ---------------------------------------------------------------------------
// 词法：切成逻辑行（多行数组与多行字符串先合并成一行）
// ---------------------------------------------------------------------------

/**
 * 扫描出「逻辑行」。
 * 为什么要预扫描：多行数组与多行基本字符串会跨行，直接按 \n 切会把它们切坏；
 * 这里只在这些结构内部把换行当普通空白，其余位置照常作为语句分隔符。
 */
function scanStatements(src: string): Stmt[] {
  const text = src.replace(/\r\n?/g, '\n')
  const out: Stmt[] = []
  let buf = ''
  let startLine = 1
  let line = 1
  let depth = 0
  let quote: string | null = null

  const flush = (): void => {
    const trimmed = buf.trim()
    if (trimmed !== '') out.push({ line: startLine, text: trimmed })
    buf = ''
  }

  let i = 0
  while (i < text.length) {
    if (quote !== null) {
      if (text.startsWith(quote, i)) {
        buf += quote
        i += quote.length
        quote = null
        continue
      }
      // 基本字符串里的转义序列整体搬走，避免其中的引号误判为结束符
      if (text[i] === '\\' && (quote === '"' || quote === '"""')) {
        buf += text.slice(i, i + 2)
        i += 2
        continue
      }
      if (text[i] === '\n') line += 1
      buf += text[i]
      i += 1
      continue
    }
    if (depth === 0 && text.startsWith('"""', i)) {
      quote = '"""'
      buf += '"""'
      i += 3
      continue
    }
    if (depth === 0 && text.startsWith("'''", i)) {
      quote = "'''"
      buf += "'''"
      i += 3
      continue
    }
    const ch = text[i]
    if (ch === '"' || ch === "'") {
      quote = ch
      buf += ch
      i += 1
      continue
    }
    if (ch === '#') {
      while (i < text.length && text[i] !== '\n') i += 1
      continue
    }
    if (ch === '[') depth += 1
    if (ch === ']') depth -= 1
    if (ch === '\n') {
      line += 1
      i += 1
      if (depth === 0) {
        flush()
        startLine = line
      } else {
        buf += ' '
      }
      continue
    }
    buf += ch
    i += 1
  }
  if (quote !== null) fail(startLine, 1, '字符串未闭合')
  flush()
  return out
}

// ---------------------------------------------------------------------------
// 值解析
// ---------------------------------------------------------------------------

function skipSpace(src: string, cur: Cursor): void {
  while (cur.i < src.length && (src[cur.i] === ' ' || src[cur.i] === '\t')) cur.i += 1
}

/** escapes=false 用于字面字符串：TOML 规定其中的反斜杠就是普通字符 */
function readUntil(src: string, cur: Cursor, line: number, end: string, escapes: boolean): string {
  let out = ''
  while (cur.i < src.length) {
    if (src.startsWith(end, cur.i)) {
      cur.i += end.length
      return out
    }
    const ch = src[cur.i]
    if (ch === '\\' && escapes) {
      const next = src[cur.i + 1]
      if (next === undefined) fail(line, cur.i + 1, '反斜杠后缺少转义字符')
      if (next === 'u' || next === 'U') {
        const width = next === 'u' ? 4 : 8
        const hex = src.slice(cur.i + 2, cur.i + 2 + width)
        if (!new RegExp(`^[0-9a-fA-F]{${width}}$`).test(hex)) {
          fail(line, cur.i + 2, `\\${next} 转义需要 ${width} 位十六进制`)
        }
        out += String.fromCodePoint(Number.parseInt(hex, 16))
        cur.i += 2 + width
        continue
      }
      const mapped = BASIC_ESCAPES[next]
      if (mapped === undefined) fail(line, cur.i + 1, `不支持的转义 \\${next}`)
      out += mapped
      cur.i += 2
      continue
    }
    out += ch
    cur.i += 1
  }
  fail(line, cur.i + 1, `字符串未闭合，缺少 ${end}`)
}

/** 基本字符串（"…"）与多行基本字符串（"""…"""） */
function readBasicString(src: string, cur: Cursor, line: number): string {
  if (src.startsWith('"""', cur.i)) {
    cur.i += 3
    // 开头紧跟的换行按 TOML 规范被忽略
    if (src[cur.i] === '\n') cur.i += 1
    return readUntil(src, cur, line, '"""', true)
  }
  cur.i += 1
  const body = readUntil(src, cur, line, '"', true)
  if (body.includes('\n')) fail(line, cur.i + 1, '单行字符串内部不能换行')
  return body
}

/** 字面字符串（'…'）与多行字面字符串（'''…'''），不做任何转义 */
function readLiteralString(src: string, cur: Cursor, line: number): string {
  if (src.startsWith("'''", cur.i)) {
    cur.i += 3
    if (src[cur.i] === '\n') cur.i += 1
    return readUntil(src, cur, line, "'''", false)
  }
  cur.i += 1
  const body = readUntil(src, cur, line, "'", false)
  if (body.includes('\n')) fail(line, cur.i + 1, '单行字符串内部不能换行')
  return body
}

function toNumberValue(token: string): number | null {
  let sign = 1
  let body = token
  if (body[0] === '+' || body[0] === '-') {
    if (body[0] === '-') sign = -1
    body = body.slice(1)
  }
  if (body === '') return null
  if (/^\d[\d_]*$/.test(body)) return sign * Number(body.replace(/_/g, ''))
  if (/^0[xX][0-9a-fA-F][0-9a-fA-F_]*$/.test(body)) {
    return sign * Number.parseInt(body.slice(2).replace(/_/g, ''), 16)
  }
  if (/^0[oO][0-7][0-7_]*$/.test(body)) {
    return sign * Number.parseInt(body.slice(2).replace(/_/g, ''), 8)
  }
  if (/^0[bB][01][01_]*$/.test(body)) {
    return sign * Number.parseInt(body.slice(2).replace(/_/g, ''), 2)
  }
  if (/^(\d[\d_]*)?\.[\d_]*([eE][-+]?\d+)?$/.test(body) || /^\d[\d_]*[eE][-+]?\d+$/.test(body)) {
    const value = Number(body.replace(/_/g, ''))
    return Number.isNaN(value) ? null : sign * value
  }
  return null
}

/** JSON 没有日期时间类型，保留原始字面量字符串，避免时区信息被吃掉 */
function isDatetimeLiteral(token: string): boolean {
  return (
    RE_OFFSET_DT.test(token) ||
    RE_LOCAL_DT.test(token) ||
    RE_LOCAL_DATE.test(token) ||
    RE_LOCAL_TIME.test(token)
  )
}

function resolveToken(token: string, line: number, column: number): TomlValue {
  if (token === '') fail(line, column, '缺少值')
  if (token === 'true') return true
  if (token === 'false') return false
  if (isDatetimeLiteral(token)) return token
  if (token === 'inf' || token === '+inf') return Number.POSITIVE_INFINITY
  if (token === '-inf') return Number.NEGATIVE_INFINITY
  if (token === 'nan' || token === '+nan' || token === '-nan') return Number.NaN
  const num = toNumberValue(token)
  if (num !== null) return num
  fail(line, column, `无法识别的值「${token}」，字符串请用引号包裹`)
}

function parseValue(src: string, cur: Cursor, line: number): TomlValue {
  skipSpace(src, cur)
  const ch = src[cur.i]
  if (ch === undefined) fail(line, src.length + 1, '等号后缺少值')
  if (ch === '"') return readBasicString(src, cur, line)
  if (ch === "'") return readLiteralString(src, cur, line)
  if (ch === '[') {
    cur.i += 1
    const out: TomlValue[] = []
    for (;;) {
      skipSpace(src, cur)
      if (src[cur.i] === ']') {
        cur.i += 1
        return out
      }
      out.push(parseValue(src, cur, line))
      skipSpace(src, cur)
      if (src[cur.i] === ',') {
        cur.i += 1
        continue
      }
      if (src[cur.i] === ']') {
        cur.i += 1
        return out
      }
      fail(line, cur.i + 1, '数组缺少 ] 或 ,')
    }
  }
  if (ch === '{') {
    cur.i += 1
    const out: Record<string, TomlValue> = {}
    for (;;) {
      skipSpace(src, cur)
      if (src[cur.i] === '}') {
        cur.i += 1
        return out
      }
      const path = parseKeyPath(src, cur, line)
      skipSpace(src, cur)
      if (src[cur.i] !== '=') fail(line, cur.i + 1, '内联表缺少 =')
      cur.i += 1
      const value = parseValue(src, cur, line)
      assign(out, path, value, line)
      skipSpace(src, cur)
      if (src[cur.i] === ',') {
        cur.i += 1
        continue
      }
      if (src[cur.i] === '}') {
        cur.i += 1
        return out
      }
      fail(line, cur.i + 1, '内联表缺少 } 或 ,')
    }
  }
  const start = cur.i
  while (cur.i < src.length && src[cur.i] !== ',' && src[cur.i] !== ']' && src[cur.i] !== '}') {
    cur.i += 1
  }
  return resolveToken(src.slice(start, cur.i).trim(), line, start + 1)
}

// ---------------------------------------------------------------------------
// 键路径
// ---------------------------------------------------------------------------

function parseKeyPath(src: string, cur: Cursor, line: number): string[] {
  const parts: string[] = []
  for (;;) {
    skipSpace(src, cur)
    const ch = src[cur.i]
    let part: string
    if (ch === '"') part = readBasicString(src, cur, line)
    else if (ch === "'") part = readLiteralString(src, cur, line)
    else {
      const start = cur.i
      while (cur.i < src.length && /[A-Za-z0-9_-]/.test(src[cur.i])) cur.i += 1
      part = src.slice(start, cur.i)
      if (part === '') fail(line, cur.i + 1, '键名为空或含非法字符')
    }
    parts.push(part)
    skipSpace(src, cur)
    if (src[cur.i] === '.') {
      cur.i += 1
      continue
    }
    return parts
  }
}

function isPlainObject(value: unknown): value is Record<string, TomlValue> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 按点号键路径写入；中间层自动补表，撞上已存在的非表则报错 */
function assign(
  table: Record<string, TomlValue>,
  path: readonly string[],
  value: TomlValue,
  line: number,
): void {
  let node: Record<string, TomlValue> = table
  for (let k = 0; k < path.length - 1; k += 1) {
    const seg = path[k]
    const next = node[seg]
    if (next === undefined) {
      const created: Record<string, TomlValue> = {}
      node[seg] = created
      node = created
    } else if (isPlainObject(next)) {
      node = next
    } else {
      fail(line, 1, `键「${seg}」已被定义为值，不能再作为父键`)
    }
  }
  const leaf = path[path.length - 1]
  const exists = node[leaf]
  if (exists !== undefined && typeof exists === 'object' && exists !== null) {
    fail(line, 1, `键「${leaf}」已被定义为表，不能赋普通值`)
  }
  node[leaf] = value
}

// ---------------------------------------------------------------------------
// 解析入口
// ---------------------------------------------------------------------------

export function parseToml(src: string): TomlValue {
  const stmts = scanStatements(src)
  const root: Record<string, TomlValue> = {}
  let current: Record<string, TomlValue> = root

  for (const stmt of stmts) {
    if (stmt.text.startsWith('[')) {
      const isArrayTable = stmt.text.startsWith('[[')
      const inner = isArrayTable ? stmt.text.slice(2, -2) : stmt.text.slice(1, -1)
      if (isArrayTable ? !stmt.text.endsWith(']]') : !stmt.text.endsWith(']')) {
        fail(stmt.line, stmt.text.length + 1, '表头缺少 ]')
      }
      const cur: Cursor = { i: 0 }
      const innerTrim = inner.trim()
      const path = parseKeyPath(innerTrim, cur, stmt.line)
      if (cur.i !== innerTrim.length) {
        fail(stmt.line, cur.i + 1, '表头里有多余字符')
      }

      let parent: Record<string, TomlValue> = root
      for (let k = 0; k < path.length - 1; k += 1) {
        const seg = path[k]
        const next = parent[seg]
        if (next === undefined) {
          const created: Record<string, TomlValue> = {}
          parent[seg] = created
          parent = created
        } else if (isPlainObject(next)) {
          parent = next
        } else if (Array.isArray(next) && isPlainObject(next[next.length - 1])) {
          // [a.b] 出现在 [[a]] 之后时，最后一项才是父表
          parent = next[next.length - 1] as Record<string, TomlValue>
        } else {
          fail(stmt.line, 1, `键「${seg}」已存在且不是表`)
        }
      }
      const leaf = path[path.length - 1]
      if (isArrayTable) {
        let list = parent[leaf]
        if (list === undefined) {
          list = []
          parent[leaf] = list
        }
        if (!Array.isArray(list)) {
          fail(stmt.line, 1, `键「${leaf}」已被定义为普通表，不能作为数组表`)
        }
        const table: Record<string, TomlValue> = {}
        ;(list as TomlValue[]).push(table)
        current = table
      } else {
        const existing = parent[leaf]
        if (existing === undefined) {
          const table: Record<string, TomlValue> = {}
          parent[leaf] = table
          current = table
        } else if (isPlainObject(existing)) {
          current = existing
        } else {
          fail(stmt.line, 1, `键「${leaf}」已定义过，不能重复定义为表`)
        }
      }
      continue
    }

    const cur: Cursor = { i: 0 }
    const path = parseKeyPath(stmt.text, cur, stmt.line)
    skipSpace(stmt.text, cur)
    if (stmt.text[cur.i] !== '=') fail(stmt.line, cur.i + 1, '键后缺少 =')
    cur.i += 1
    const value = parseValue(stmt.text, cur, stmt.line)
    skipSpace(stmt.text, cur)
    if (cur.i < stmt.text.length && stmt.text[cur.i] !== '#') {
      fail(stmt.line, cur.i + 1, '值之后有多余字符')
    }
    assign(current, path, value, stmt.line)
  }

  return root
}

// ---------------------------------------------------------------------------
// JSON → TOML
// ---------------------------------------------------------------------------

function keyStr(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key)
}

function valueStr(value: TomlValue): string {
  if (value === null) throw new TomlParseError('TOML 没有 null，请先去掉值为 null 的键')
  if (typeof value === 'boolean' || typeof value === 'number') return String(value)
  if (typeof value === 'string') {
    // 看起来像日期时间的字符串按日期时间字面量输出，避免被加上引号
    return isDatetimeLiteral(value) ? value : JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => valueStr(item)).join(', ')}]`
  }
  throw new TomlParseError('数组里混有对象时无法内联，请把对象数组放在顶层键下')
}

function writeBody(obj: Record<string, TomlValue>, path: readonly string[], out: string[]): void {
  const scalars: string[] = []
  const tables: [string, Record<string, TomlValue>][] = []
  const arrayTables: [string, Record<string, TomlValue>[]][] = []

  for (const key of Object.keys(obj)) {
    const value = obj[key]
    if (isPlainObject(value)) {
      tables.push([key, value])
      continue
    }
    if (Array.isArray(value) && value.length > 0 && value.every(isPlainObject)) {
      arrayTables.push([key, value as Record<string, TomlValue>[]])
      continue
    }
    scalars.push(`${keyStr(key)} = ${valueStr(value)}`)
  }

  out.push(...scalars)
  for (const [key, table] of tables) {
    const next = [...path, key]
    out.push('')
    out.push(`[${next.map(keyStr).join('.')}]`)
    writeBody(table, next, out)
  }
  for (const [key, list] of arrayTables) {
    const next = [...path, key]
    for (const item of list) {
      out.push('')
      out.push(`[[${next.map(keyStr).join('.')}]]`)
      writeBody(item, next, out)
    }
  }
}

/** JSON → TOML：顶层必须是对象，因为 TOML 文档的根就是一个表 */
export function toToml(value: unknown): string {
  if (!isPlainObject(value)) {
    throw new TomlParseError('JSON 顶层必须是对象，才能转成 TOML 文档')
  }
  const out: string[] = []
  writeBody(value as Record<string, TomlValue>, [], out)
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/, '')
}

// ---------------------------------------------------------------------------
// 对外入口
// ---------------------------------------------------------------------------

/**
 * TOML ⇄ JSON 互转。
 * 空输入返回空串（UI 需要区分「没输入」与「解析失败」）；
 * 语法不支持或 JSON 非法时抛中文错误，而不是输出半截结果。
 */
export function transform(input: TomlInput, options: TomlOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new TomlParseError('输入超过 1,000,000 字符上限')
  }
  if (options.direction === 'toml2json') {
    return JSON.stringify(parseToml(input.text), null, Number(options.indent))
  }
  let data: unknown
  try {
    data = JSON.parse(input.text)
  } catch {
    throw new TomlParseError('不是合法的 JSON，无法转换为 TOML')
  }
  return toToml(data)
}
