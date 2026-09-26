import type { MockApiDevInput, MockApiDevOptions } from './schema'

const MAX_INPUT = 200_000

export interface Field {
  name: string
  type: string
}

const KNOWN_TYPES = ['string', 'number', 'boolean', 'email', 'date', 'id'] as const

/** 解析 `name:type` 定义（逗号或换行分隔） */
export function parseFields(text: string): Field[] {
  const parts = text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  const fields: Field[] = []
  for (const part of parts) {
    const idx = part.indexOf(':')
    if (idx === -1) throw new Error(`字段定义应为 name:type，收到：${part}`)
    const name = part.slice(0, idx).trim()
    const type = part
      .slice(idx + 1)
      .trim()
      .toLowerCase()
    if (name === '') throw new Error('字段名不能为空（片段：' + part + '）')
    if (!(KNOWN_TYPES as readonly string[]).includes(type)) {
      throw new Error(`不支持的字段类型 ${type}（${name}），可选：${KNOWN_TYPES.join(' / ')}`)
    }
    fields.push({ name, type })
  }
  return fields
}

/** 按类型生成第 i 行的确定性 mock 值 */
export function genValue(type: string, name: string, i: number): unknown {
  switch (type) {
    case 'number':
      return i * 10
    case 'boolean':
      return i % 2 === 0
    case 'email':
      return `user${i + 1}@example.com`
    case 'date':
      return new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10)
    case 'id':
      return i + 1
    case 'string':
    default:
      return `${name}_${i + 1}`
  }
}

/** 生成 count 条 mock 记录 */
export function genMockRows(fields: Field[], count: number): Array<Record<string, unknown>> {
  const rows: Array<Record<string, unknown>> = []
  for (let i = 0; i < count; i += 1) {
    const row: Record<string, unknown> = {}
    for (const field of fields) row[field.name] = genValue(field.type, field.name, i)
    rows.push(row)
  }
  return rows
}

/** Express 片段 */
function expressSnippet(rows: unknown): string {
  return [
    '// server.js —— 运行：node server.js（需 npm i express）',
    "const express = require('express')",
    'const app = express()',
    'app.use(express.json())',
    `const data = ${JSON.stringify(rows, null, 2)}`,
    "app.get('/api/items', (req, res) => res.json(data))",
    "app.listen(3000, () => console.log('mock on http://localhost:3000/api/items'))",
  ].join('\n')
}

/** json-server 片段 */
function jsonServerSnippet(rows: unknown): string {
  return [
    '// db.json —— 运行：npx json-server db.json',
    '{',
    `  "items": ${JSON.stringify(rows)}`,
    '}',
  ].join('\n')
}

export function transform(input: MockApiDevInput, options: MockApiDevOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  const fields = parseFields(input.text)
  if (fields.length === 0) throw new Error('未解析到任何字段')
  const rows = genMockRows(fields, Number(options.count))

  if (options.target === 'express') return expressSnippet(rows)
  if (options.target === 'json-server') return jsonServerSnippet(rows)
  return JSON.stringify(rows, null, 2)
}
