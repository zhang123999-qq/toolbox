// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('五子棋组件', () => {
  it('渲染棋盘、状态与重新开始按钮', () => {
    render(<Tool />)
    expect(byTestId('gomoku-board').children).toHaveLength(225)
    expect(byTestId('gomoku-status').textContent).toContain('轮到你落子')
    expect(byTestId('gomoku-restart')).toBeTruthy()
  })

  it('点击空格落子，AI 随后落子', () => {
    vi.useFakeTimers()
    render(<Tool />)
    fireEvent.click(byTestId('gomoku-cell-7-7'))
    expect(byTestId('gomoku-moves').textContent).toContain('1')
    expect(byTestId('gomoku-cell-7-7').querySelector('span')).toBeTruthy()
    fireEvent.click(byTestId('gomoku-restart'))
    expect(byTestId('gomoku-moves').textContent).toContain('0')
    expect(byTestId('gomoku-cell-7-7').querySelector('span')).toBeNull()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
  })

  it('重复点击已有棋子不重复落子', () => {
    vi.useFakeTimers()
    render(<Tool />)
    fireEvent.click(byTestId('gomoku-cell-0-0'))
    fireEvent.click(byTestId('gomoku-cell-0-0'))
    expect(byTestId('gomoku-moves').textContent).toContain('1')
    act(() => {
      vi.advanceTimersByTime(1000)
    })
  })
})
