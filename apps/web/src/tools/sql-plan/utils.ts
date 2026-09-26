import type { SqlPlanInput, SqlPlanOptions } from './schema'

/** 粗略解析 SELECT，抽出表 / JOIN / WHERE / ORDER BY / LIMIT */
export interface ParsedQuery {
  tables: string[]
  joins: string[]
  hasWhere: boolean
  whereColumns: string[]
  hasOrderBy: boolean
  hasGroupBy: boolean
  limit: number | null
}

export function parseSelect(sql: string): ParsedQuery {
  const s = sql.trim().replace(/;+$/, '')
  if (!/^select\b/i.test(s)) {
    throw new Error('只支持 SELECT 语句的执行计划估算')
  }

  const fromMatch = s.match(/from\s+([a-zA-Z_][\w$]*)/i)
  const tables: string[] = fromMatch ? [fromMatch[1]] : []

  // 允许表名后带别名：JOIN orders o ON ... / JOIN orders ON ...
  const joinRe = /join\s+([a-zA-Z_][\w$]*)(?:\s+[a-zA-Z_][\w$]*)?\s+(?:on|using)/gi
  const joins: string[] = []
  let m: RegExpExecArray | null
  while ((m = joinRe.exec(s)) !== null) joins.push(m[1])

  const whereMatch = s.match(/where\s+([\s\S]*?)(?:\bgroup\b|\border\b|\blimit\b|$)/i)
  const whereColumns: string[] = []
  if (whereMatch) {
    const cond = whereMatch[1]
    const colRe = /([a-zA-Z_][\w$]*)\s*(?:=|>=|<=|>|<|like|in)/gi
    let cm: RegExpExecArray | null
    while ((cm = colRe.exec(cond)) !== null) whereColumns.push(cm[1].toLowerCase())
  }

  const limitMatch = s.match(/limit\s+(\d+)/i)
  return {
    tables,
    joins,
    hasWhere: !!whereMatch,
    whereColumns,
    hasOrderBy: /\border\s+by\b/i.test(s),
    hasGroupBy: /\bgroup\s+by\b/i.test(s),
    limit: limitMatch ? Number(limitMatch[1]) : null,
  }
}

/** 估算成本（相对值，非真实优化器） */
export function estimate(q: ParsedQuery): { steps: string[]; cost: number } {
  const steps: string[] = []
  let cost = 0

  const baseTable = q.tables[0] ?? '(unknown)'
  if (q.hasWhere && q.whereColumns.length > 0) {
    steps.push(`  -> Index Scan on ${baseTable}（命中 WHERE 列：${q.whereColumns.join(', ')}）`)
    cost += 10
  } else {
    steps.push(`  -> Seq Scan on ${baseTable}（无 WHERE，全表扫描）`)
    cost += 100
  }

  for (const j of q.joins) {
    steps.push(`  -> Nested Loop Join with ${j}（假设 join 列有索引）`)
    cost += 50
  }

  if (q.hasGroupBy) {
    steps.push('  -> HashAggregate（GROUP BY）')
    cost += 30
  }
  if (q.hasOrderBy) {
    steps.push('  -> Sort（ORDER BY，无索引时额外内存/磁盘开销）')
    cost += 40
  }
  if (q.limit != null) {
    steps.push(`  -> Limit ${q.limit}`)
  }

  return { steps, cost }
}

export function render(sql: string): string {
  const q = parseSelect(sql)
  const { steps, cost } = estimate(q)
  const lines: string[] = []
  lines.push('解析结果：')
  lines.push(`  主表：${q.tables[0] ?? '(无)'}`)
  if (q.joins.length) lines.push(`  JOIN：${q.joins.join(', ')}`)
  lines.push(`  WHERE：${q.hasWhere ? '有（列：' + q.whereColumns.join(', ') + '）' : '无'}`)
  lines.push(`  ORDER BY：${q.hasOrderBy ? '有' : '无'}`)
  lines.push(`  GROUP BY：${q.hasGroupBy ? '有' : '无'}`)
  lines.push(`  LIMIT：${q.limit ?? '无'}`)
  lines.push('')
  lines.push('估算执行计划：')
  lines.push(...steps)
  lines.push('')
  lines.push(`相对成本（估算）：${cost}`)
  if (cost > 150) lines.push('提示：成本偏高，考虑给 WHERE / JOIN 列加索引。')
  return lines.join('\n')
}

export function transform(input: SqlPlanInput, _options: SqlPlanOptions): string {
  if (input.text.trim() === '') return ''
  if (input.text.length > 10000) throw new Error('输入超过 10,000 字符上限')
  return render(input.text)
}
