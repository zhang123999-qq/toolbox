import type { SqlFormatInput, SqlFormatOptions } from './schema'

/** SQL 语法／词法错误：消息里带行列位置，便于用户一眼定位 */
export class SqlFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SqlFormatError'
  }
}

const MAX_INPUT = 200_000

/** 词法单元类型：`keyword` 才会受大小写模式影响 */
type TokenType = 'keyword' | 'word' | 'number' | 'string' | 'quoted' | 'comment' | 'punct'

interface Token {
  readonly type: TokenType
  readonly value: string
  /** 原始文本的大写形式：大小写模式改写 value 后仍需靠它判断语义 */
  readonly up: string
  readonly start: number
}

/**
 * 关键字词典。只收常见 DML / DDL 关键字与聚合函数，
 * 不在表里的词一律按普通标识符处理（保留用户原样）。
 */
const KEYWORDS = new Set([
  'SELECT',
  'DISTINCT',
  'ALL',
  'AS',
  'FROM',
  'WHERE',
  'GROUP',
  'BY',
  'HAVING',
  'ORDER',
  'ASC',
  'DESC',
  'LIMIT',
  'OFFSET',
  'FETCH',
  'ROWS',
  'ONLY',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'FULL',
  'CROSS',
  'NATURAL',
  'ON',
  'USING',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE',
  'REPLACE',
  'TRUNCATE',
  'MERGE',
  'CREATE',
  'TABLE',
  'VIEW',
  'INDEX',
  'SCHEMA',
  'DATABASE',
  'SEQUENCE',
  'TRIGGER',
  'FUNCTION',
  'PROCEDURE',
  'DROP',
  'ALTER',
  'ADD',
  'MODIFY',
  'CHANGE',
  'RENAME',
  'COLUMN',
  'CONSTRAINT',
  'PRIMARY',
  'KEY',
  'FOREIGN',
  'REFERENCES',
  'CASCADE',
  'RESTRICT',
  'UNIQUE',
  'DEFAULT',
  'CHECK',
  'IF',
  'EXISTS',
  'BEGIN',
  'COMMIT',
  'ROLLBACK',
  'TRANSACTION',
  'GRANT',
  'REVOKE',
  'EXPLAIN',
  'ANALYZE',
  'WITH',
  'RECURSIVE',
  'TEMPORARY',
  'TEMP',
  'RETURNING',
  'WINDOW',
  'OVER',
  'PARTITION',
  'NULL',
  'NOT',
  'TRUE',
  'FALSE',
  'AND',
  'OR',
  'IN',
  'IS',
  'LIKE',
  'ILIKE',
  'RLIKE',
  'REGEXP',
  'BETWEEN',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'NULLS',
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

/**
 * 需要「前面换行」的子句关键字。
 * 只收子句起点，收太多（如 AND / THEN）会把语句切得过碎，反而难读。
 */
const CLAUSE_KEYWORDS = new Set([
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP',
  'HAVING',
  'ORDER',
  'LIMIT',
  'OFFSET',
  'VALUES',
  'SET',
  'UPDATE',
  'INSERT',
  'DELETE',
  'CREATE',
  'ALTER',
  'DROP',
  'TRUNCATE',
  'MERGE',
  'REPLACE',
  'RETURNING',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'ON',
  'USING',
  'WITH',
  'JOIN',
  'LEFT',
  'RIGHT',
  'INNER',
  'OUTER',
  'FULL',
  'CROSS',
  'NATURAL',
  'BEGIN',
  'COMMIT',
  'GRANT',
  'REVOKE',
  'EXPLAIN',
])

/** `LEFT JOIN` 这类组合要整体另起一行，故 JOIN 紧跟修饰词时不再换行 */
const JOIN_MODIFIERS = new Set(['LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL'])

/** 声明后新成行的点缀：`SELECT ... FROM (SELECT ...) t` 里的子查询 */
const BREAK_AFTER_OPEN = new Set(['SELECT', 'WITH'])

/**
 * 紧跟左括号时不加空格的名字：函数调用与带精度的类型。
 * VALUES / IN / EXISTS 这类关键字后的括号必须留空格，否则语义看着像函数。
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

const NO_SPACE_BEFORE = new Set([',', ')', ';', '.', '::', ']'])
const NO_SPACE_AFTER = new Set(['(', '.', '::', '['])

const TWO_CHAR_OPS = new Set(['<=', '>=', '<>', '!=', '||', '::', '->', '>>', '<<', '=>'])
const SINGLE_CHARS = '(){}[].,;:+-*/%<>=|&^~!?@'

/** 把字符下标换算成「第 N 行第 M 列」，错误消息里直接可见 */
function positionOf(text: string, index: number): string {
  const before = text.slice(0, Math.max(0, index))
  const line = before.split('\n').length
  const col = index - before.lastIndexOf('\n')
  return `第 ${line} 行第 ${col} 列`
}

/** 扫描被引号包裹的片段，返回结束位置（不含起始字符） */
function scanQuoted(text: string, start: number, quote: string): number {
  let i = start + 1
  while (i < text.length) {
    const ch = text[i] as string
    // MySQL 默认开启反斜杠转义，跳过被转义的字符，避免把 \' 误判为结束
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === quote) {
      // SQL 里引号内邻接的同字符是转义写法（'' / ""），不是结束
      if (text[i + 1] === quote) {
        i += 2
        continue
      }
      return i + 1
    }
    i += 1
  }
  const label = quote === "'" ? '字符串' : '标识符引用'
  throw new SqlFormatError(`未闭合的${label}（${positionOf(text, start)}）`)
}

/** 扫描数字字面量：支持小数、科学计数法与 0x 十六进制 */
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
 * 词法分析：把 SQL 切成 token。
 * 必须先分清楚字符串 / 注释 / 标识符引用，否则其中的关键字会被误判并换行。
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

    if (ch === '-' && sql[i + 1] === '-') {
      let j = i + 2
      while (j < sql.length && (sql[j] as string) !== '\n') j += 1
      const value = sql.slice(i, j).replace(/\s+$/, '')
      tokens.push({ type: 'comment', value, up: '', start })
      i = j
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end < 0) throw new SqlFormatError(`未闭合的块注释（${positionOf(sql, start)}）`)
      tokens.push({ type: 'comment', value: sql.slice(i, end + 2), up: '', start })
      i = end + 2
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      const end = scanQuoted(sql, i, ch)
      tokens.push({
        type: ch === "'" ? 'string' : 'quoted',
        value: sql.slice(i, end),
        up: '',
        start,
      })
      i = end
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      const end = scanNumber(sql, i)
      tokens.push({ type: 'number', value: sql.slice(i, end), up: '', start })
      i = end
      continue
    }
    if (/[A-Za-z_一-龥]/.test(ch)) {
      let j = i
      while (j < sql.length && /[A-Za-z0-9_$一-龥]/.test(sql[j] as string)) j += 1
      const value = sql.slice(i, j)
      const up = value.toUpperCase()
      tokens.push({ type: KEYWORDS.has(up) ? 'keyword' : 'word', value, up, start })
      i = j
      continue
    }
    const two = sql.slice(i, i + 2)
    if (TWO_CHAR_OPS.has(two)) {
      tokens.push({ type: 'punct', value: two, up: two, start })
      i += 2
      continue
    }
    if (SINGLE_CHARS.includes(ch)) {
      tokens.push({ type: 'punct', value: ch, up: ch, start })
      i += 1
      continue
    }
    // 其余字符（如 PostgreSQL 的 $1 占位符）照样保留，只是独立成 token
    tokens.push({ type: 'punct', value: ch, up: ch, start })
    i += 1
  }
  assertBalanced(sql, tokens)
  return tokens
}

/** 括号必须配对，否则格式化结果无法反映语句结构 */
function assertBalanced(sql: string, tokens: readonly Token[]): void {
  const stack: number[] = []
  for (const token of tokens) {
    if (token.value === '(') stack.push(token.start)
    if (token.value !== ')') continue
    if (stack.length === 0) {
      throw new SqlFormatError(`多余的右括号（${positionOf(sql, token.start)}）`)
    }
    stack.pop()
  }
  const last = stack[stack.length - 1]
  if (last !== undefined) {
    throw new SqlFormatError(`未闭合的左括号（${positionOf(sql, last)}）`)
  }
}

/** 按模式改写关键字大小写；普通标识符保持原样，避免破坏用户列名 */
function applyCase(tokens: readonly Token[], mode: SqlFormatOptions['mode']): Token[] {
  if (mode === 'keep') return tokens.map((token) => token)
  return tokens.map((token) =>
    token.type === 'keyword'
      ? {
          ...token,
          value: mode === 'upper' ? token.value.toUpperCase() : token.value.toLowerCase(),
        }
      : token,
  )
}

/** 当前 token 是否应另起一行 */
function needsNewlineBefore(token: Token, prev: Token): boolean {
  if (token.type === 'comment' || prev.type === 'comment') return true
  if (token.type !== 'keyword') return false
  if (!CLAUSE_KEYWORDS.has(token.up)) return false
  if (token.up === 'JOIN' && JOIN_MODIFIERS.has(prev.up)) return false
  // 同 DELETE FROM / INSERT INTO：这两个词拆开读反而别扭
  if (token.up === 'FROM' && prev.up === 'DELETE') return false
  // 紧跟 `(` / `.` / `;` 的子句关键词不换行，避免出现空行或割裂限定名
  return !['(', '.', ';'].includes(prev.value)
}

/** 相邻两个 token 之间的分隔符（有无空格） */
function separator(prev: Token, token: Token): string {
  if (NO_SPACE_BEFORE.has(token.value)) return ''
  if (NO_SPACE_AFTER.has(prev.value)) return ''
  if (token.value === '(' && isCallOrType(prev)) return ''
  return ' '
}

/** 左括号紧跟函数名 / 类型名时不留空格（COUNT(*) 而不是 COUNT (*)） */
function isCallOrType(prev: Token): boolean {
  if (prev.type === 'keyword') return CALL_OR_TYPE.has(prev.up)
  // 未登记的函数名同样按函数调用处理；INSERT INTO t (cols) 由渲染层单独保留空格
  return prev.type === 'word' || prev.type === 'quoted'
}

/** 渲染状态里每个括号的信息 */
interface ParenFrame {
  /** 开括号后是否已换行 */
  readonly broke: boolean
  /** 是否为 CREATE TABLE 的列清单（清单内每个元素独占一行） */
  readonly list: boolean
  /** 括号内内容的缩进层级 */
  readonly contentDepth: number
}

/** 渲染：按深度缩进、按子句换行，注释独占一行 */
function render(tokens: readonly Token[], unit: string): string {
  const lines: string[] = []
  const parens: ParenFrame[] = []
  let line = ''
  let depth = 0
  let forceBreak = false
  // 语句级状态：每遇到 `;` 或开头就重置，用于判断 INSERT 列名清单与 CREATE TABLE 清单
  let head: string[] = []
  let beforeFirstParen = true
  let expectInsertList = false

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    const prev = index > 0 ? (tokens[index - 1] as Token) : undefined
    const next = index + 1 < tokens.length ? (tokens[index + 1] as Token) : undefined

    if (prev === undefined || prev.value === ';') {
      head = []
      beforeFirstParen = true
      expectInsertList = false
      if (token.type === 'keyword' && ['INSERT', 'REPLACE'].includes(token.up)) {
        expectInsertList = true
      }
    }
    if (beforeFirstParen && depth === 0 && token.type === 'keyword') head.push(token.up)

    // INSERT INTO t (a, b)：表名后的第 0 层括号要留空格，不能被当成函数调用
    const declaration =
      beforeFirstParen && depth === 0 && head.includes('CREATE') && head.includes('TABLE')
    const insertList = token.value === '(' && expectInsertList && depth === 0
    const keepParenSpace = token.value === '(' && (insertList || declaration)

    let breakBefore = forceBreak
    forceBreak = false

    if (token.value === ')') {
      const frame = parens.pop()
      depth = Math.max(0, depth - 1)
      if (frame?.broke || frame?.list) breakBefore = true
    }
    if (!breakBefore && prev !== undefined) {
      // 单行括号（函数调用、窗口函数 OVER(...)）内部不再按子句换行
      const frame = parens[parens.length - 1]
      const inlineParen = frame !== undefined && !frame.broke && !frame.list
      breakBefore = !inlineParen && needsNewlineBefore(token, prev)
    }
    if (breakBefore && line.trim() !== '') {
      lines.push(line)
      line = ''
    }

    if (line === '') line = unit.repeat(depth)
    else line += keepParenSpace ? ' ' : separator(prev as Token, token)
    line += token.value

    if (token.type === 'comment' || token.value === ';') forceBreak = true

    if (token.value === '(') {
      const broke =
        declaration ||
        (next !== undefined && next.type === 'keyword' && BREAK_AFTER_OPEN.has(next.up))
      parens.push({ broke, list: declaration, contentDepth: depth + 1 })
      beforeFirstParen = false
      if (insertList) expectInsertList = false
      depth += 1
      if (broke) forceBreak = true
    }

    // 列清单里每个逗号后换行，这样一行的就是一列
    if (token.value === ',' && parens.some((frame) => frame.list && frame.contentDepth === depth)) {
      forceBreak = true
    }
  }

  if (line.trim() !== '') lines.push(line)
  return lines.join('\n')
}

/**
 * 格式化 SQL —— 纯函数，不依赖 React / DOM。
 * 顺序：空值短路 → 长度兜底 → 词法分析（顺带校验括号）→ 大小写归一 → 排版。
 */
export function transform(input: SqlFormatInput, options: SqlFormatOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new SqlFormatError(`输入超过 ${MAX_INPUT} 字符上限`)
  }
  const tokens = applyCase(tokenize(input.text), options.mode)
  return render(tokens, ' '.repeat(Number(options.indent)))
}
