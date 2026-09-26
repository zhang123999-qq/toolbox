import { describe, expect, it } from 'vitest'
import { estimate, parseSelect, render, transform } from './utils'

describe('sql-plan / parseSelect', () => {
  it('抽出主表 / JOIN / WHERE 列 / ORDER BY / LIMIT', () => {
    const q = parseSelect(
      'SELECT * FROM users u JOIN orders o ON u.id=o.user_id WHERE u.status=1 ORDER BY o.total LIMIT 10',
    )
    expect(q.tables).toContain('users')
    expect(q.joins).toContain('orders')
    expect(q.hasWhere).toBe(true)
    expect(q.whereColumns).toContain('status')
    expect(q.hasOrderBy).toBe(true)
    expect(q.limit).toBe(10)
  })

  it('无 WHERE 时标为全表扫描', () => {
    expect(parseSelect('SELECT * FROM users').hasWhere).toBe(false)
  })

  it('非 SELECT 抛错', () => {
    expect(() => parseSelect('DELETE FROM users')).toThrow(/只支持 SELECT/)
  })
})

describe('sql-plan / estimate', () => {
  it('有 WHERE 走 Index Scan，无 WHERE 走 Seq Scan', () => {
    const withWhere = estimate(parseSelect('SELECT * FROM users WHERE a=1'))
    expect(withWhere.steps[0]).toContain('Index Scan')
    const noWhere = estimate(parseSelect('SELECT * FROM users'))
    expect(noWhere.steps[0]).toContain('Seq Scan')
  })

  it('JOIN 与 ORDER BY 增加成本', () => {
    const plan = estimate(parseSelect('SELECT * FROM a JOIN b ON a.id=b.a_id ORDER BY a.x'))
    expect(plan.steps.some((s) => s.includes('Nested Loop Join'))).toBe(true)
    expect(plan.steps.some((s) => s.includes('Sort'))).toBe(true)
  })
})

describe('sql-plan / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('render 输出成本', () => {
    const out = render('SELECT * FROM users WHERE id=1')
    expect(out).toContain('估算执行计划')
    expect(out).toContain('相对成本')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(10001) }, {})).toThrow(/上限/)
  })
})
