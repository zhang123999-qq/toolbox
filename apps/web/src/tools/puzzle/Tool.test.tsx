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

describe('拼图组件', () => {
  it('渲染棋盘、步数与重新打乱按钮', () => {
    render(<Tool />)
    expect(byTestId('puzzle-board').children).toHaveLength(16)
    expect(byTestId('puzzle-moves').textContent).toContain('0')
    expect(byTestId('puzzle-new')).toBeTruthy()
  })

  it('切换尺寸重建棋盘', () => {
    render(<Tool />)
    fireEvent.change(byTestId('puzzle-size'), { target: { value: '3' } })
    expect(byTestId('puzzle-board').children).toHaveLength(9)
    expect(byTestId('puzzle-moves').textContent).toContain('0')
  })

  it('点击与空格相邻的数字步数增加', () => {
    render(<Tool />)
    // 找到空格周围的数字按钮：遍历所有数字按钮逐个尝试
    const board = byTestId('puzzle-board')
    const before = byTestId('puzzle-moves').textContent
    const buttons = Array.from(board.querySelectorAll('button'))
    for (const b of buttons) {
      fireEvent.click(b)
      if (byTestId('puzzle-moves').textContent !== before) break
    }
    expect(byTestId('puzzle-moves').textContent).not.toBe(before)
  })
})
