// @vitest-environment jsdom
/**
 * d1-config 组件测试（#808）：TOML 与示例 SQL 生成。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('d1-config · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-databaseId',
      'input-binding',
      'input-migrationsDir',
      'input-tableName',
      'output',
      'copy',
      'download',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成 d1_databases 片段与建表 SQL', () => {
    render(<Tool />)
    expect(byTestId('d1-toml').textContent).toContain('[[d1_databases]]')
    expect(byTestId('d1-sql').textContent).toContain('CREATE TABLE users (')
  })

  it('非法 ID 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-databaseId'), { target: { value: 'bad' } })
    expect(byTestId('d1-error').textContent).toContain('UUID 格式')
  })

  it('非法表名显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-tableName'), { target: { value: 'user-table' } })
    expect(byTestId('d1-error').textContent).toContain('合法标识符')
  })
})
