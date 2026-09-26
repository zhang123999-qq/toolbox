import { parseCreateTables } from '../../lib/sql-ddl'
import type { ErDiagramInput, ErDiagramOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class ErDiagramError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErDiagramError'
  }
}

const MAX_INPUT = 200_000

interface Relation {
  readonly table: string
  readonly column: string
  readonly refTable: string
  readonly refColumn?: string
}

/** 去掉 SQL 行注释 / 块注释，避免注释里的 REFERENCES 干扰 */
function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
}

/** 去掉反引号 / 双引号 / 方括号界定符 */
function unquote(text: string): string {
  return text
    .trim()
    .replace(/^[`"[]/, '')
    .replace(/[`"]$/, '')
    .replace(/\]$/, '')
}

/** 从 '(' 起做括号配平，返回与之配对的 ')' 的下标；找不到返回 -1 */
function matchParen(text: string, openIndex: number): number {
  let depth = 0
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1
    else if (text[i] === ')') {
      depth -= 1
      if (depth === 0) return i
    }
  }
  return -1
}

/** 在顶层（括号深度 0）按逗号切分 */
function splitTopLevel(text: string): string[] {
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

/**
 * 扫描全部外键关系：既认表级 `FOREIGN KEY (c) REFERENCES t (c)`，
 * 也认列级 `c TYPE REFERENCES t (c)`。
 */
export function extractRelations(sql: string): readonly Relation[] {
  const clean = stripComments(sql)
  const relations: Relation[] = []
  const head = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?/gi

  let headMatch: RegExpExecArray | null
  while ((headMatch = head.exec(clean)) !== null) {
    const rest = clean.slice(headMatch.index + headMatch[0].length)
    const nameMatch = /^([^\s(]+)\s*\(/.exec(rest)
    if (!nameMatch) continue
    const table = unquote(nameMatch[1])
    const openParen = rest.indexOf('(')
    const closeParen = matchParen(rest, openParen)
    if (closeParen < 0) continue
    const body = rest.slice(openParen + 1, closeParen)

    for (const rawPart of splitTopLevel(body)) {
      const part = rawPart.trim()
      const fkMatch =
        /^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(\s*([^)]+?)\s*\)\s+REFERENCES\s+([^\s(]+)\s*(?:\(\s*([^)]+?)\s*\))?/i.exec(
          part,
        )
      if (fkMatch) {
        relations.push({
          table,
          column: unquote(fkMatch[1]),
          refTable: unquote(fkMatch[2]),
          refColumn: fkMatch[3] ? unquote(fkMatch[3]) : undefined,
        })
        continue
      }
      const inlineMatch = /^([^\s]+).*?\bREFERENCES\s+([^\s(]+)\s*(?:\(\s*([^)]+?)\s*\))?/i.exec(
        part,
      )
      if (inlineMatch && !/^(PRIMARY|UNIQUE|CONSTRAINT|KEY|INDEX|CHECK)$/i.test(inlineMatch[1])) {
        relations.push({
          table,
          column: unquote(inlineMatch[1]),
          refTable: unquote(inlineMatch[2]),
          refColumn: inlineMatch[3] ? unquote(inlineMatch[3]) : undefined,
        })
      }
    }
  }
  return relations
}

/** Mermaid 实体名必须是字母 / 数字 / 下划线；其它字符（含连字符）替换为下划线 */
export function entityId(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9_]/g, '_')
  return /^[0-9]/.test(cleaned) ? `t_${cleaned}` : cleaned
}

/** SQL 类型 → Mermaid 属性类型词（不含长度 / 精度） */
function attributeType(sqlType: string): string {
  return sqlType.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'unknown'
}

/** 生成 Mermaid erDiagram 源码 */
export function renderMermaid(sql: string): string {
  const tables = parseCreateTables(sql)
  if (tables.length === 0) {
    throw new ErDiagramError('没有识别到任何 CREATE TABLE 建表语句')
  }
  const relations = extractRelations(sql)
  const known = new Set(tables.map((t) => t.name))

  const lines: string[] = ['erDiagram']

  // 关系：一个父实体对应零或多个子实体（||--o{），标签用外键列名
  const seen = new Set<string>()
  for (const rel of relations) {
    if (!known.has(rel.table) || !known.has(rel.refTable)) continue
    const child = entityId(rel.table)
    const parent = entityId(rel.refTable)
    const key = `${parent}.${child}.${rel.column}`
    if (seen.has(key)) continue
    seen.add(key)
    lines.push(`  ${parent} ||--o{ ${child} : "${rel.column}"`)
  }

  // 实体块：字段 + PK/FK 标记
  const fkColumns = new Map<string, Set<string>>()
  for (const rel of relations) {
    const set = fkColumns.get(rel.table) ?? new Set<string>()
    set.add(rel.column)
    fkColumns.set(rel.table, set)
  }

  for (const table of tables) {
    const id = entityId(table.name)
    const fks = fkColumns.get(table.name) ?? new Set<string>()
    lines.push(`  ${id} {`)
    for (const column of table.columns) {
      const marker = column.primaryKey ? 'PK' : fks.has(column.name) ? 'FK' : ''
      lines.push(
        `    ${attributeType(column.sqlType)} ${entityId(column.name)}${marker ? ` ${marker}` : ''}`,
      )
    }
    lines.push('  }')
  }

  return lines.join('\n')
}

/** 输入建表 DDL → Mermaid erDiagram 源码 */
export function transform(input: ErDiagramInput, _options: ErDiagramOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new ErDiagramError(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  return renderMermaid(input.text)
}
