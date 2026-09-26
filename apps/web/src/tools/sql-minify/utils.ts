import type { SqlMinifyInput, SqlMinifyOptions } from './schema'

/** 词法／结构错误：消息里带行列位置，便于用户一眼定位 */
export class SqlMinifyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SqlMinifyError'
  }
}

const MAX_INPUT = 200_000

type TokenType = 'keyword' | 'word' | 'number' | 'string' | 'quoted' | 'punct'

interface Token {
  readonly type: TokenType
  readonly value: string
  readonly start: number
}

/** 前不留空格的符号：逗号、右括号、分号、`a.b` 限定名 */
const NO_SPACE_BEFORE = new Set([',', ')', ';', ']', '.', '::'])
/** 后不留空格的符号：左括号、逗号、分号、`a.b` 限定名 */
const NO_SPACE_AFTER = new Set(['(', '[', '.', '::', ',', ';'])

const TWO_CHAR_OPS = new Set(['<=', '>=', '<>', '!=', '||', '::', '->', '>>', '<<', '=>'])

/**
 * 紧跟左括号时不加空格的名字：常见函数与列类型。
 * 只对名单内的名字收紧，`INSERT INTO t (a,b)` 这种「表名 + 列清单」必须留空格。
 */
const CALL_OR_TYPE = new Set([
  'COUNT',
  'SUM',
  'AVG',
  'MIN',
  'MAX',
  'NOW',
  'CURRENT_TIMESTAMP',
  'COALESCE',
  'IFNULL',
  'NULLIF',
  'CONCAT',
  'CAST',
  'LENGTH',
  'UPPER',
  'LOWER',
  'TRIM',
  'SUBSTRING',
  'ROUND',
  'VARCHAR',
  'CHAR',
  'CHARACTER',
  'INT',
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'MEDIUMINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'DOUBLE',
  'REAL',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'DATETIME',
  'TEXT',
  'BLOB',
  'JSON',
  'BOOLEAN',
  'BOOL',
  'SERIAL',
  'UUID',
  'ENUM',
])

/** 把字符下标换算成「第 N 行第 M 列」 */
function positionOf(text: string, index: number): string {
  const before = text.slice(0, Math.max(0, index))
  const line = before.split('\n').length
  const col = index - before.lastIndexOf('\n')
  return `第 ${line} 行第 ${col} 列`
}

/** 扫描被引号包裹的片段，返回结束位置 */
function scanQuoted(text: string, start: number, quote: string): number {
  let i = start + 1
  while (i < text.length) {
    const ch = text[i] as string
    // MySQL 默认开启反斜杠转义：跳过被转义的字符，避免把 \' 误判为结束
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === quote) {
      // 引号内邻接的同字符是转义写法（'' / ""），不是结束
      if (text[i + 1] === quote) {
        i += 2
        continue
      }
      return i + 1
    }
    i += 1
  }
  const label = quote === "'" ? '字符串' : '标识符引用'
  throw new SqlMinifyError(`未闭合的${label}（${positionOf(text, start)}）`)
}

/** 扫描数字字面量：小数、科学计数法与 0x 十六进制 */
function scanNumber(text: string, start: number): number {
  let i = start
  if ((text[start] as string) === '0' && /[xX]/.test(text[start + 1] ?? '')) {
    i = start + 2
    while (i < text.length && /[0-9a-fA-F]/.test(text[i] as string)) i += 1
    return i
  }
  let seenDot = false
  while (i < text.length) {
    const ch = text[i] as string
    if (/[0-9]/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '.' && !seenDot && /[0-9]/.test(text[i + 1] ?? '')) {
      seenDot = true
      i += 2
      continue
    }
    if (/[eE]/.test(ch) && /[0-9]/.test(text[i - 1] ?? '') && /[0-9+-]/.test(text[i + 1] ?? '')) {
      i += 2
      continue
    }
    break
  }
  return i
}

/**
 * 词法分析：把 SQL 切成 token，过程中直接丢弃注释。
 * 必须先识别字符串与注释，否则其中的空格会被当成多余空白删掉。
 */
export function tokenize(sql: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < sql.length) {
    const ch = sql[i] as string
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    const start = i

    // MySQL 的 `#` 与标准 `--` 都是行注释；块注释 /* */ 直接跳过
    if ((ch === '-' && sql[i + 1] === '-') || ch === '#') {
      let j = i + 2
      while (j < sql.length && (sql[j] as string) !== '\n') j += 1
      i = j
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end < 0) throw new SqlMinifyError(`未闭合的块注释（${positionOf(sql, start)}）`)
      i = end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const end = scanQuoted(sql, i, ch)
      tokens.push({
        type: ch === "'" ? 'string' : 'quoted',
        value: sql.slice(i, end),
        start,
      })
      i = end
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      const end = scanNumber(sql, i)
      tokens.push({ type: 'number', value: sql.slice(i, end), start })
      i = end
      continue
    }
    if (/[A-Za-z_一-龥]/.test(ch)) {
      let j = i
      while (j < sql.length && /[A-Za-z0-9_$一-龥]/.test(sql[j] as string)) j += 1
      tokens.push({ type: 'word', value: sql.slice(i, j), start })
      i = j
      continue
    }
    const two = sql.slice(i, i + 2)
    if (TWO_CHAR_OPS.has(two)) {
      tokens.push({ type: 'punct', value: two, start })
      i += 2
      continue
    }
    tokens.push({ type: 'punct', value: ch, start })
    i += 1
  }
  assertBalanced(sql, tokens)
  return tokens
}

/** 括号必须配对：压缩后结构不可读，宁可提前报错 */
function assertBalanced(sql: string, tokens: readonly Token[]): void {
  const stack: number[] = []
  for (const token of tokens) {
    if (token.value === '(') stack.push(token.start)
    if (token.value !== ')') continue
    if (stack.length === 0) {
      throw new SqlMinifyError(`多余的右括号（${positionOf(sql, token.start)}）`)
    }
    stack.pop()
  }
  const last = stack[stack.length - 1]
  if (last !== undefined) {
    throw new SqlMinifyError(`未闭合的左括号（${positionOf(sql, last)}）`)
  }
}

/**
 * 相邻 token 之间是否需要一个空格。
 * 只保留「必须」的空格：两个名字之间、名字与符号之间；其余一律压缩掉。
 */
function needSpace(prev: Token, token: Token): boolean {
  if (NO_SPACE_BEFORE.has(token.value)) return false
  if (NO_SPACE_AFTER.has(prev.value)) return false
  if (prev.type === 'punct' && token.type === 'punct') return false
  // COUNT(*) / VARCHAR(64)：函数名与类型名后的括号不留空格
  if (token.value === '(' && prev.type === 'word' && CALL_OR_TYPE.has(prev.value.toUpperCase())) {
    return false
  }
  return true
}

/** 按最小间隔把 token 拼回单行字符串 */
function join(tokens: readonly Token[]): string {
  let out = ''
  let prev: Token | undefined
  for (const token of tokens) {
    if (prev === undefined) out = token.value
    else out += (needSpace(prev, token) ? ' ' : '') + token.value
    prev = token
  }
  return out
}

/**
 * 压缩 SQL —— 纯函数，不依赖 React / DOM。
 * 顺序：空值短路 → 长度兜底 → 词法分析（顺带丢注释、校验括号）→ 最小间隔拼接。
 */
export function transform(input: SqlMinifyInput, _options: SqlMinifyOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new SqlMinifyError(`输入超过 ${MAX_INPUT} 字符上限`)
  }
  return join(tokenize(input.text))
}
