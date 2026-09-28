// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('俄罗斯方块组件', () => {
  it('渲染棋盘、得分与开始按钮', () => {
    render(<Tool />)
    expect(byTestId('tetris-board')).toBeTruthy()
    expect(byTestId('tetris-score').textContent).toContain('得分：0')
    expect(byTestId('tetris-start')).toBeTruthy()
  })

  it('开始后方向键操作不报错', () => {
    vi.useFakeTimers()
    try {
      render(<Tool />)
      fireEvent.click(byTestId('tetris-start'))
      fireEvent.keyDown(window, { key: 'ArrowLeft' })
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      fireEvent.keyDown(window, { key: ' ' })
      expect(byTestId('tetris-board')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})
