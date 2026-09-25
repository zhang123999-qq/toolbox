// @vitest-environment jsdom
/**
 * sql-escape 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('sql-escape · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出为带引号的 MySQL 字面量', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain("'O\\'Brien'")
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切到 PostgreSQL 后改用双写单引号', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('类型'), { target: { value: 'postgres' } })
    fireEvent.change(byTestId('input'), { target: { value: "O'Brien" } })
    expect(byTestId('output').textContent).toBe("'O''Brien'")
  })

  it('取消「引号风格」后输出不再带首尾引号', () => {
    render(<Tool />)
    fireEvent.click(screen.getByLabelText('引号风格'))
    fireEvent.change(byTestId('input'), { target: { value: "O'Brien" } })
    expect(byTestId('output').textContent).toBe("O\\'Brien")
  })

  it('非法输入进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'unescape' } })
    fireEvent.change(byTestId('input'), { target: { value: 'abc\\' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
