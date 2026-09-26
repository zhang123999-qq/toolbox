// @vitest-environment jsdom
/**
 * sql-format 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('sql-format · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后关键字转大写并按子句换行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      [
        '-- 查活跃用户及其订单数',
        'SELECT u.id, u.name, COUNT(*) AS cnt',
        'FROM users u',
        'LEFT JOIN orders o',
        'ON o.user_id = u.id',
        "WHERE u.age > 18 AND u.status = 'active'",
        'GROUP BY u.id',
        'HAVING COUNT(*) > 1',
        'ORDER BY cnt DESC',
        'LIMIT 10',
      ].join('\n'),
    )
  })

  it('切换到 lower 模式后关键字变小写', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'SELECT A FROM T' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'lower' } })
    expect(byTestId('output').textContent).toBe(['select A', 'from T'].join('\n'))
  })

  it('切换缩进档位为 8 后子查询缩进加深', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'select * from (select id from t) x' } })
    fireEvent.change(screen.getByLabelText('缩进'), { target: { value: '8' } })
    expect(byTestId('output').textContent).toContain('        SELECT id')
  })

  it('非法输入时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'select count( from t' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('第 1 行')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
