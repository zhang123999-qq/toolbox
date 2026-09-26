// @vitest-environment jsdom
/**
 * sql-dialect 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('sql-dialect · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后默认按 PostgreSQL 输出', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      [
        '-- 建表 + 查询：MySQL 方言',
        'CREATE TABLE users (id SERIAL, "name" VARCHAR(64) NOT NULL, birth TIMESTAMP NULL, PRIMARY KEY (id));',
        'SELECT "name", COALESCE(birth, NOW())',
        'FROM users',
        'WHERE id > 1',
        'LIMIT 5',
        'OFFSET 10',
      ].join('\n'),
    )
  })

  it('切换到 MySQL 目标后保留 LIMIT offset,size 写法', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('目标'), { target: { value: 'mysql' } })
    fireEvent.change(byTestId('input'), { target: { value: 'SELECT id FROM t LIMIT 5 OFFSET 10' } })
    fireEvent.change(screen.getByLabelText('源语言'), { target: { value: 'postgres' } })
    expect(byTestId('output').textContent).toContain('LIMIT 10, 5')
  })

  it('source 选 auto 时能自动识别 MySQL 输入', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'SELECT id FROM t LIMIT 3, 5' } })
    expect(byTestId('output').textContent).toContain('LIMIT 5')
    expect(byTestId('output').textContent).toContain('OFFSET 3')
  })

  it('非法输入时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: "SELECT 'abc FROM t" } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
