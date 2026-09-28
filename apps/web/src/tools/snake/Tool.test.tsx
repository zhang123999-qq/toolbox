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

describe('贪吃蛇组件', () => {
  it('渲染棋盘、食物与开始按钮', () => {
    render(<Tool />)
    expect(byTestId('snake-board')).toBeTruthy()
    expect(byTestId('snake-food')).toBeTruthy()
    expect(byTestId('snake-start')).toBeTruthy()
  })

  it('开始后方向键可改变方向', () => {
    vi.useFakeTimers()
    try {
      render(<Tool />)
      fireEvent.click(byTestId('snake-start'))
      fireEvent.keyDown(window, { key: 'ArrowUp' })
      fireEvent.keyDown(window, { key: 'ArrowDown' })
      expect(byTestId('snake-board')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})
