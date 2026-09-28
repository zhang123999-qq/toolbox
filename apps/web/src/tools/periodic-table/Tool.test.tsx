// @vitest-environment jsdom
/**
 * periodic-table 组件测试（#821）：查询与分类模式。
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

describe('periodic-table · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认查询铁元素', () => {
    render(<Tool />)
    expect(byTestId('periodic-table-detail').textContent).toContain('铁（Fe，Iron）')
  })

  it('未知查询显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'Xx' } })
    expect(byTestId('periodic-table-error').textContent).toContain('未找到元素「Xx」')
  })

  it('分类模式列出卤素', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'category' } })
    const detail = byTestId('periodic-table-detail').textContent ?? ''
    expect(detail).toContain('卤素（6 种）')
    expect(detail).toContain('氟（F）')
  })
})
