// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
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

describe('2048 组件', () => {
  it('渲染棋盘与总分', () => {
    render(<Tool />)
    expect(byTestId('g2048-board')).toBeTruthy()
    expect(byTestId('g2048-score').textContent).toContain('总分：')
  })

  it('方向键滑动不报错，重新开始重置', () => {
    render(<Tool />)
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.click(byTestId('g2048-restart'))
    expect(byTestId('g2048-board')).toBeTruthy()
  })
})
