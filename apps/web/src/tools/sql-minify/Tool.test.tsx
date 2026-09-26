// @vitest-environment jsdom
/**
 * sql-minify 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('sql-minify · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出压缩为单行且不含注释', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      'SELECT u.id,u.name,COUNT(*) AS cnt FROM users u LEFT JOIN orders o ON o.user_id = u.id ' +
        "WHERE u.age > 18 AND u.status = 'active' GROUP BY u.id ORDER BY cnt DESC LIMIT 10",
    )
  })

  it('输入多行 SQL 后即时压成单行', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'SELECT   a,\n  b\nFROM   t' } })
    expect(byTestId('output').textContent).toBe('SELECT a,b FROM t')
  })

  it('字符串字面量内的多个空格不被压掉', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: "select 'a   b' from t" } })
    expect(byTestId('output').textContent).toBe("select 'a   b' from t")
  })

  it('非法输入时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: "select 'abc from t" } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
