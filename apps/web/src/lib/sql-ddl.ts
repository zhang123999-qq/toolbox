/**
 * CREATE TABLE DDL 的共用词法解析（与具体产物无关的纯函数）。
 *
 * SQL 转 ORM（#168）、SQL 转 JSON Schema（#169）、ER 图（#185）都要先把建表语句
 * 解析成「表 → 列」结构。按 DEVELOPMENT.md §8.4「工具之间禁止互相 import，
 * 共用逻辑一律上提到 lib」，解析逻辑统一放这里。
 *
 * 只做结构解析，不连接数据库、不做方言校验。
 */

export interface Column {
  readonly name: string
  readonly sqlType: string
  readonly length?: number
  readonly precision?: number
  readonly scale?: number
  readonly nullable: boolean
  readonly primaryKey: boolean
  readonly autoIncrement: boolean
  readonly unique: boolean
  readonly defaultValue?: string
  readonly unsigned: boolean
}

export interface Table {
  readonly name: string
  readonly columns: readonly Column[]
}

/** 去掉反引号 / 双引号 / 方括号包裹的标识符界定符 */
export function unquoteIdentifier(text: string): string {
  const trimmed = text.trim()
  const match = /^[`"[]?(.+?)[`"]?$/.exec(trimmed)
  return match ? match[1] : trimmed
}

/** 去掉 SQL 行注释 / 块注释 */
export function stripSqlComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 在顶层（括号深度 0）按逗号切分，避免类型里的 (10,2) 被切断 */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const char of text) {
    if (char === '(') depth += 1
    if (char === ')') depth -= 1
    if (char === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim() !== '') parts.push(current)
  return parts
}

const TYPE_WITH_SIZE = /^([A-Za-z]+)(?:\s*\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\))?/

/** 取出 DEFAULT 之后到列尾的字面量（不改写，按原样生成） */
function readDefault(definition: string): string | undefined {
  const match =
    /\bDEFAULT\s+(.+?)(?:\s+(?:NOT\s+NULL|NULL|PRIMARY\s+KEY|AUTO_INCREMENT|AUTOINCREMENT|UNIQUE|UNSIGNED|COMMENT\b.*|ON\s+UPDATE\b.*))*$/i.exec(
      definition.trim(),
    )
  return match ? match[1].trim().replace(/,$/, '') : undefined
}

/** 解析单列定义 */
function parseColumn(definition: string): Column | null {
  const tokens = definition.trim().split(/\s+/)
  if (tokens.length === 0) return null
  const name = unquoteIdentifier(tokens[0])
  if (name === '') return null

  // 表级约束（PRIMARY KEY (...) / UNIQUE (...) / CONSTRAINT / FOREIGN/KEY）不是列定义
  const upperHead = name.toUpperCase()
  if (
    upperHead === 'PRIMARY' ||
    upperHead === 'UNIQUE' ||
    upperHead === 'CONSTRAINT' ||
    upperHead === 'FOREIGN' ||
    upperHead === 'KEY' ||
    upperHead === 'INDEX' ||
    upperHead === 'CHECK'
  ) {
    return null
  }

  const typeMatch = TYPE_WITH_SIZE.exec(tokens.slice(1).join(' '))
  const sqlType = typeMatch ? typeMatch[1].toUpperCase() : 'STRING'
  const first = typeMatch?.[2]
  const second = typeMatch?.[3]
  const upper = definition.toUpperCase()

  return {
    name,
    sqlType,
    length:
      second === undefined && first !== undefined && /CHAR|TEXT|BINARY|BLOB/.test(sqlType)
        ? Number(first)
        : undefined,
    precision: first !== undefined && /DECIMAL|NUMERIC/.test(sqlType) ? Number(first) : undefined,
    scale: second !== undefined && /DECIMAL|NUMERIC/.test(sqlType) ? Number(second) : undefined,
    nullable: !/NOT\s+NULL/.test(upper),
    primaryKey: /PRIMARY\s+KEY/.test(upper),
    autoIncrement: /AUTO_INCREMENT|AUTOINCREMENT|GENERATED\s+.*IDENTITY|SERIAL/.test(upper),
    unique: /(^|[\s,(])UNIQUE([\s,)]|$)/.test(upper),
    defaultValue: readDefault(definition),
    unsigned: /UNSIGNED/.test(upper),
  }
}

/** 解析全部 CREATE TABLE（用括号配平定位表体，避免 VARCHAR(100) 的括号截断） */
export function parseCreateTables(sql: string): Table[] {
  const clean = stripSqlComments(sql)
  const tables: Table[] = []
  const head = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi

  let headMatch: RegExpExecArray | null
  while ((headMatch = head.exec(clean)) !== null) {
    const afterHead = clean.slice(headMatch.index + headMatch[0].length)
    const nameMatch = /^([^\s(]+)\s*\(/.exec(afterHead)
    if (!nameMatch) continue
    const name = unquoteIdentifier(nameMatch[1])

    // 从表名后的 '(' 开始做括号配平
    let depth = 0
    let bodyStart = -1
    let bodyEnd = -1
    const offset = nameMatch[0].length - 1 // 指向结尾的 '('
    for (let i = offset; i < afterHead.length; i += 1) {
      if (afterHead[i] === '(') {
        if (depth === 0) bodyStart = i + 1
        depth += 1
      } else if (afterHead[i] === ')') {
        depth -= 1
        if (depth === 0) {
          bodyEnd = i
          break
        }
      }
    }
    if (bodyEnd === -1) continue
    // 让外层循环从本表之后继续找下一个 CREATE TABLE
    head.lastIndex = headMatch.index + headMatch[0].length + bodyEnd + 1

    const body = afterHead.slice(bodyStart, bodyEnd)
    const columns: Column[] = []
    const tablePks: string[] = []

    for (const part of splitTopLevel(body)) {
      const trimmed = part.trim()
      const pkMatch = /^PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(trimmed)
      if (pkMatch) {
        for (const col of pkMatch[1].split(',')) tablePks.push(unquoteIdentifier(col))
        continue
      }
      const column = parseColumn(trimmed)
      if (column) columns.push(column)
    }

    if (tablePks.length > 0) {
      for (let i = 0; i < columns.length; i += 1) {
        if (tablePks.includes(columns[i].name)) {
          columns[i] = { ...columns[i], primaryKey: true, nullable: false }
        }
      }
    }

    if (name !== '' && columns.length > 0) tables.push({ name, columns })
  }
  return tables
}
