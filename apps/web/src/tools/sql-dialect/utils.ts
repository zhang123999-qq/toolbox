import type { SqlDialectInput, SqlDialectOptions } from './schema'

/** 词法／结构错误：消息里带行列位置 */
export class SqlDialectError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SqlDialectError'
  }
}

const MAX_INPUT = 200_000

type TokenType = 'keyword' | 'word' | 'number' | 'string' | 'quoted' | 'comment' | 'punct'

interface Token {
  readonly type: TokenType
  readonly value: string
  /** 原始文本的大写形式：判断方言特征与关键字时不受输入大小写影响 */
  readonly up: string
  readonly start: number
}

type Dialect = 'mysql' | 'postgres'

/** 需要「前面换行」的子句关键字：只收主子句，避免把语句切碎 */
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
  'RETURNING',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'ON',
  'USING',
  'WITH',
])

/** `LEFT JOIN` 这类组合整体换行 */
const JOIN_MODIFIERS = new Set(['LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS', 'NATURAL'])

const KEYWORDS = new Set([
  ...CLAUSE_KEYWORDS,
  ...JOIN_MODIFIERS,
  'JOIN',
  'INTO',
  'AS',
  'AND',
  'OR',
  'NOT',
  'NULL',
  'TRUE',
  'FALSE',
  'IS',
  'IN',
  'LIKE',
  'ILIKE',
  'BETWEEN',
  'CASE',
  'WHEN',
  'THEN',
  'ELSE',
  'END',
  'ASC',
  'DESC',
  'DISTINCT',
  'PRIMARY',
  'KEY',
  'UNIQUE',
  'DEFAULT',
  'CONSTRAINT',
  'REFERENCES',
  'FOREIGN',
  'TABLE',
  'VIEW',
  'INDEX',
  'IF',
  'EXISTS',
  'AUTO_INCREMENT',
  'SERIAL',
  'BIGSERIAL',
  'SMALLSERIAL',
  'UNSIGNED',
  'ENGINE',
  'CHARSET',
  'COLLATE',
  'COMMENT',
  'CURRENT_TIMESTAMP',
  'CAST',
])

const NO_SPACE_BEFORE = new Set([',', ')', ';', '.', '::', ']'])
const NO_SPACE_AFTER = new Set(['(', '[', '.', '::'])

/** 紧跟左括号时不加空格的名字：常见函数与列类型（COUNT(*) / VARCHAR(64)） */
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
  'JSONB',
  'BOOLEAN',
  'BOOL',
  'SERIAL',
  'UUID',
  'ENUM',
  'NEXTVAL',
])

const TWO_CHAR_OPS = new Set(['<=', '>=', '<>', '!=', '||', '::', '->', '>>', '<<', '=>'])

/** MySQL → PostgreSQL 的类型 / 函数改写表 */
const MYSQL_TO_PG: Record<string, string> = {
  DATETIME: 'TIMESTAMP',
  TINYINT: 'SMALLINT',
  MEDIUMINT: 'INTEGER',
  LONGTEXT: 'TEXT',
  MEDIUMTEXT: 'TEXT',
  LONG: 'TEXT',
  IFNULL: 'COALESCE',
}

/** PostgreSQL → MySQL 的类型 / 函数改写表 */
const PG_TO_MYSQL: Record<string, string> = {
  JSONB: 'JSON',
  TIMESTAMPTZ: 'TIMESTAMP',
  SMALLSERIAL: 'SMALLINT',
}

/** MySQL 自增列原类型 → PostgreSQL 序列类型 */
const SERIAL_OF: Record<string, string> = {
  INT: 'SERIAL',
  INTEGER: 'SERIAL',
  BIGINT: 'BIGSERIAL',
  SMALLINT: 'SMALLSERIAL',
  TINYINT: 'SMALLSERIAL',
}

/** MySQL 序列类型 → MySQL 自增整数类型 */
const INT_OF_SERIAL: Record<string, string> = {
  SERIAL: 'INT',
  BIGSERIAL: 'BIGINT',
  SMALLSERIAL: 'SMALLINT',
}

/** MySQL 表级选项：出现在 CREATE TABLE 右括号之后，PostgreSQL 不认，直接丢弃 */
const MYSQL_TABLE_OPTIONS = new Set([
  'ENGINE',
  'CHARSET',
  'CHARACTER',
  'COLLATE',
  'COMMENT',
  'ROW_FORMAT',
  'KEY_BLOCK_SIZE',
  'TABLESPACE',
  'STORAGE',
  'AUTO_INCREMENT',
  'COMPRESSION',
  'ENCRYPTION',
  'CHECKSUM',
  'DELAY_KEY_WRITE',
  'INSERT_METHOD',
  'DATA',
  'INDEX',
  'MAX_ROWS',
  'MIN_ROWS',
  'AVG_ROW_LENGTH',
  'PACK_KEYS',
  'STATS_AUTO_RECALC',
  'STATS_PERSISTENT',
  'STATS_SAMPLE_PAGES',
  'PARTITION',
  'DEFAULT',
])

/** 自增类型名，用于替换前的回溯查找 */
const INT_TYPES = new Set(['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT'])

function positionOf(text: string, index: number): string {
  const before = text.slice(0, Math.max(0, index))
  const line = before.split('\n').length
  const col = index - before.lastIndexOf('\n')
  return `第 ${line} 行第 ${col} 列`
}

function scanQuoted(text: string, start: number, quote: string): number {
  let i = start + 1
  while (i < text.length) {
    const ch = text[i] as string
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === quote) {
      if (text[i + 1] === quote) {
        i += 2
        continue
      }
      return i + 1
    }
    i += 1
  }
  const label = quote === "'" ? '字符串' : '标识符引用'
  throw new SqlDialectError(`未闭合的${label}（${positionOf(text, start)}）`)
}

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
 * 词法分析：切 token 并保留注释（方言转换要维持可读性，注释不能丢）。
 * 字符串 / 注释优先识别，避免其中的关键字被误改。
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

    if ((ch === '-' && sql[i + 1] === '-') || ch === '#') {
      let j = i + 2
      while (j < sql.length && (sql[j] as string) !== '\n') j += 1
      tokens.push({ type: 'comment', value: sql.slice(i, j).trimEnd(), up: '', start })
      i = j
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end < 0) throw new SqlDialectError(`未闭合的块注释（${positionOf(sql, start)}）`)
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
    tokens.push({ type: 'punct', value: ch, up: ch, start })
    i += 1
  }
  assertBalanced(sql, tokens)
  return tokens
}

/** 括号必须配对，否则方言转换可能改错结构 */
function assertBalanced(sql: string, tokens: readonly Token[]): void {
  const stack: number[] = []
  for (const token of tokens) {
    if (token.value === '(') stack.push(token.start)
    if (token.value !== ')') continue
    if (stack.length === 0) {
      throw new SqlDialectError(`多余的右括号（${positionOf(sql, token.start)}）`)
    }
    stack.pop()
  }
  const last = stack[stack.length - 1]
  if (last !== undefined) {
    throw new SqlDialectError(`未闭合的左括号（${positionOf(sql, last)}）`)
  }
}

/**
 * 判定方言：两边各自数特征记号，取分高者。
 * 反向引号、AUTO_INCREMENT、UNSIGNED 只可能是 MySQL；
 * `::` 强转、SERIAL、RAISE 只可能是 PostgreSQL。
 */
export function detectDialect(tokens: readonly Token[]): Dialect {
  let mysql = 0
  let postgres = 0
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    if (token.type === 'quoted' && token.value.startsWith('`')) mysql += 2
    if (token.type === 'quoted' && token.value.startsWith('"')) postgres += 1
    if (token.up === 'AUTO_INCREMENT' || token.up === 'UNSIGNED') mysql += 3
    if (['SERIAL', 'BIGSERIAL', 'SMALLSERIAL', 'RETURNING', 'ILIKE', 'JSONB'].includes(token.up)) {
      postgres += 3
    }
    if (token.up === 'IFNULL' || token.up === 'DATETIME') mysql += 1
    if (token.value === '::') postgres += 3
    // MySQL 独有的 LIMIT offset, size 写法
    if (token.up === 'LIMIT' && (tokens[index + 2] as Token | undefined)?.value === ',') mysql += 3
  }
  if (postgres > mysql) return 'postgres'
  if (mysql > postgres) return 'mysql'
  // 无特征时按 MySQL 处理（两者差异里 MySQL 专有写法更多）
  return 'mysql'
}

/** 构造替换 token：沿用原 token 的位置信息，便于报错定位 */
function word(value: string): Token {
  const up = value.toUpperCase()
  return { type: KEYWORDS.has(up) ? 'keyword' : 'word', value, up, start: -1 }
}

function punct(value: string): Token {
  return { type: 'punct', value, up: value, start: -1 }
}

/**
 * 读取 LIMIT 子句本体（`LIMIT` 之后直到下一个子句关键字 / `;` / 右括号为止）。
 * 返回消耗掉的 token 数与收集到的 token，供两种分页写法互转使用。
 */
function readLimit(tokens: readonly Token[], start: number): { tokens: Token[]; used: number } {
  const collected: Token[] = []
  let index = start
  while (index < tokens.length) {
    const token = tokens[index] as Token
    if ([';', ')'].includes(token.value)) break
    if (token.type === 'keyword' && token.up !== 'OFFSET' && token.up !== 'ROWS') break
    collected.push(token)
    index += 1
  }
  return { tokens: collected, used: index - start }
}

/** `LIMIT a, b` ↔ `LIMIT b OFFSET a`：只处理数字形态，参数占位符原样保留 */
function convertLimit(clause: readonly Token[], to: Dialect): Token[] {
  const numbers = clause.filter(
    (token) => token.type === 'number' || token.value === ',' || token.up === 'OFFSET',
  )
  const first = clause[0]
  if (first === undefined) return []
  const [firstNumber, second] = clause.filter((token) => token.type === 'number')
  const hasComma = clause.some((token) => token.value === ',')

  if (to === 'postgres') {
    if (hasComma && firstNumber !== undefined && second !== undefined) {
      return [word('LIMIT'), second, word('OFFSET'), firstNumber]
    }
    return [word('LIMIT'), ...clause]
  }
  if (to === 'mysql') {
    if (firstNumber !== undefined && second !== undefined && !hasComma) {
      return [word('LIMIT'), second, punct(','), firstNumber]
    }
    return [word('LIMIT'), ...clause]
  }
  return [word('LIMIT'), ...numbers]
}

/**
 * 向左回溯 `::` 强转的左操作数：`a.b`、函数调用与字面量都算，
 * 遇到关键字（如 SELECT / FROM）就停下，避免把整个子句裹进 CAST。
 */
function leftOperand(out: Token[]): number {
  let start = out.length
  let depth = 0
  while (start > 0) {
    const token = out[start - 1] as Token
    if (token.value === ')') {
      depth += 1
      start -= 1
      continue
    }
    if (token.value === '(') {
      depth -= 1
      start -= 1
      if (depth <= 0) break
      continue
    }
    if (
      token.type === 'word' ||
      token.type === 'number' ||
      token.type === 'quoted' ||
      token.type === 'string' ||
      token.value === '.'
    ) {
      start -= 1
      continue
    }
    break
  }
  return start
}

/** 丢弃 MySQL 建表选项（ENGINE=… / DEFAULT CHARSET=… 等），直到语句结束 */
function skipTableOptions(tokens: readonly Token[], start: number): number {
  let index = start
  while (index < tokens.length) {
    const token = tokens[index] as Token
    if (token.value === ';') return index - start
    if (token.type === 'keyword' && !MYSQL_TABLE_OPTIONS.has(token.up)) return index - start
    index += 1
  }
  return index - start
}

/**
 * 方言转换成实现主体：单遍扫描，边读边改写。
 * 转换顺序：注释符号 → 标识符引用 → 类型 / 函数词典 → 自增 → 分页 → 强转 → 表选项。
 */
export function convert(tokens: readonly Token[], from: Dialect, to: Dialect): Token[] {
  const out: Token[] = []
  let index = 0
  let depth = 0
  let inCreateTable = false
  let afterCreateBody = false

  while (index < tokens.length) {
    const token = tokens[index] as Token

    if (token.type === 'comment') {
      // MySQL 的 `#` 注释两种方言都能写成 `--`，统一一次，省得下游再判 dialect
      out.push({
        ...token,
        value: token.value.startsWith('#') ? `--${token.value.slice(1)}` : token.value,
      })
      index += 1
      continue
    }

    if (token.type === 'quoted') {
      if (to === 'postgres' && token.value.startsWith('`')) {
        out.push({ ...token, value: `"${token.value.slice(1, -1)}"` })
      } else if (to === 'mysql' && token.value.startsWith('"')) {
        out.push({ ...token, value: `\`${token.value.slice(1, -1)}\`` })
      } else {
        out.push(token)
      }
      index += 1
      continue
    }

    if (token.type === 'keyword' || token.type === 'word') {
      if (token.up === 'CREATE') inCreateTable = true
      if (afterCreateBody && from === 'mysql' && to === 'postgres') {
        // 一个都没吃到说明后面还有真内容，交给后续分支正常处理，避免原地踏步
        const skipped = skipTableOptions(tokens, index)
        if (skipped > 0) {
          index += skipped
          continue
        }
      }
      if (token.up === 'UNSIGNED' && from === 'mysql' && to === 'postgres') {
        index += 1
        continue
      }
      if (token.up === 'ON' && from === 'mysql' && to === 'postgres') {
        // ON UPDATE CURRENT_TIMESTAMP 是 MySQL 列级语法，PostgreSQL 用触发器实现，这里丢弃
        const next = tokens[index + 1] as Token | undefined
        const second = tokens[index + 2] as Token | undefined
        if (next?.up === 'UPDATE' && second?.up === 'CURRENT_TIMESTAMP') {
          index += 3
          continue
        }
      }
      if (token.up === 'AUTO_INCREMENT' && from === 'mysql' && to === 'postgres') {
        // 自增属性要并到前面的整数类型里：INT AUTO_INCREMENT → SERIAL
        for (let back = out.length - 1; back >= 0; back -= 1) {
          const candidate = out[back] as Token
          if (INT_TYPES.has(candidate.up)) {
            out[back] = word(SERIAL_OF[candidate.up] ?? 'SERIAL')
            break
          }
        }
        // SERIAL 自带 NOT NULL，原列的 NOT NULL 冗余，一并去掉
        const tail = out.slice(-2)
        if (tail[0]?.up === 'NOT' && tail[1]?.up === 'NULL') out.length -= 2
        index += 1
        continue
      }
      if (from === 'postgres' && to === 'mysql' && INT_OF_SERIAL[token.up] !== undefined) {
        const intType = INT_OF_SERIAL[token.up] as string
        out.push(word(intType), word('NOT'), word('NULL'), word('AUTO_INCREMENT'))
        index += 1
        continue
      }
      if (token.up === 'LIMIT') {
        const { tokens: clause, used } = readLimit(tokens, index + 1)
        out.push(...convertLimit(clause, to))
        index += 1 + used
        continue
      }
      if (token.up === 'DEFAULT' && (tokens[index + 1] as Token | undefined)?.up === 'NEXTVAL') {
        // PostgreSQL 序列默认值在 MySQL 里无从表达，连同 nextval(...) 一起丢弃
        if (from === 'postgres' && to === 'mysql') {
          let cursor = index + 1
          let depth = 0
          while (cursor < tokens.length) {
            const current = tokens[cursor] as Token
            if (current.value === '(') depth += 1
            if (current.value === ')') {
              depth -= 1
              cursor += 1
              if (depth === 0) break
              continue
            }
            cursor += 1
          }
          index = cursor
          continue
        }
      }
      const dict = from === 'mysql' && to === 'postgres' ? MYSQL_TO_PG : PG_TO_MYSQL
      if (from !== to) {
        const mapped = dict[token.up]
        if (mapped !== undefined) {
          out.push(word(mapped))
          index += 1
          continue
        }
      }
      out.push(token)
      index += 1
      continue
    }

    if (token.value === '::' && to === 'mysql') {
      // MySQL 不认 `::`，改写成标准 CAST(x AS t)
      const start = leftOperand(out)
      const operand = out.splice(start, out.length - start)
      out.push(word('CAST'), punct('('), ...operand, word('AS'))
      index += 1
      const typeToken = tokens[index] as Token | undefined
      if (typeToken !== undefined) {
        out.push(typeToken)
        index += 1
      }
      out.push(punct(')'))
      continue
    }

    if (token.value === ')') {
      depth = Math.max(0, depth - 1)
      out.push(token)
      index += 1
      // 只有把 CREATE TABLE 的最外层括号闭合了，后面的 ENGINE=… 才是表选项
      if (inCreateTable && depth === 0) afterCreateBody = true
      continue
    }

    if (token.value === ';') {
      out.push(token)
      index += 1
      inCreateTable = false
      afterCreateBody = false
      continue
    }

    if (token.value === '(') depth += 1

    out.push(token)
    index += 1
  }

  return out
}

/** 是否需要换行：子句关键字（除紧跟 LEFT/RIGHT 等修饰词的 JOIN）与注释 */
function needsNewlineBefore(token: Token, prev: Token): boolean {
  if (token.type === 'comment' || prev.type === 'comment') return true
  if (token.type !== 'keyword') return false
  if (!CLAUSE_KEYWORDS.has(token.up)) return false
  if (token.up === 'JOIN' && JOIN_MODIFIERS.has(prev.up)) return false
  if (token.up === 'FROM' && prev.up === 'DELETE') return false
  if (token.up === 'INTO' && prev.up === 'INSERT') return false
  return true
}

function separator(prev: Token, token: Token): string {
  if (NO_SPACE_BEFORE.has(token.value)) return ''
  if (NO_SPACE_AFTER.has(prev.value)) return ''
  if (token.value === '(' && CALL_OR_TYPE.has(prev.up)) return ''
  return ' '
}

/** 排版：子句换行 + 按括号深度缩进，让转换结果仍可直接阅读 */
function render(tokens: readonly Token[]): string {
  const lines: string[] = []
  let line = ''
  let depth = 0
  let forceBreak = false

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] as Token
    const prev = index > 0 ? (tokens[index - 1] as Token) : undefined

    let breakBefore = forceBreak
    forceBreak = false
    if (token.value === ')') depth = Math.max(0, depth - 1)
    if (!breakBefore && prev !== undefined) {
      breakBefore = needsNewlineBefore(token, prev)
    }
    if (breakBefore && line.trim() !== '') {
      lines.push(line)
      line = ''
    }

    if (line === '') line = '  '.repeat(depth)
    else line += separator(prev as Token, token)
    line += token.value

    if (token.type === 'comment' || token.value === ';') forceBreak = true
    if (token.value === '(') depth += 1
  }

  if (line.trim() !== '') lines.push(line)
  return lines.join('\n')
}

/**
 * MySQL ↔ PostgreSQL —— 纯函数，不依赖 React / DOM。
 * 顺序：空值短路 → 长度兜底 → 词法分析 → 方言判定 → 转换 → 排版。
 */
export function transform(input: SqlDialectInput, options: SqlDialectOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new SqlDialectError(`输入超过 ${MAX_INPUT} 字符上限`)
  }
  const tokens = tokenize(input.text)
  const from: Dialect = options.source === 'auto' ? detectDialect(tokens) : options.source
  return render(convert(tokens, from, options.target))
}
