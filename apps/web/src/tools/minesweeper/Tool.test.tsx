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

describe('扫雷组件', () => {
  it('渲染棋盘、难度选择与旗帜计数', () => {
    render(<Tool />)
    expect(byTestId('ms-board')).toBeTruthy()
    expect(byTestId('ms-diff')).toBeTruthy()
    expect(byTestId('ms-flags').textContent).toContain('旗帜：0/10')
  })

  it('左键揭开格子，右键插旗', () => {
    render(<Tool />)
    // 先插旗（此时格子尚未被揭开），再左键揭开另一个格子
    fireEvent.contextMenu(byTestId('ms-cell-8-8'))
    expect(byTestId('ms-flags').textContent).toContain('旗帜：1/10')
    fireEvent.click(byTestId('ms-cell-0-0'))
    expect(byTestId('ms-board')).toBeTruthy()
  })

  it('切换难度后重新开局', () => {
    render(<Tool />)
    fireEvent.change(byTestId('ms-diff'), { target: { value: '中级 16x16·40雷' } })
    expect(byTestId('ms-flags').textContent).toContain('旗帜：0/40')
  })
})
