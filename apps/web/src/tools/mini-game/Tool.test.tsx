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

describe('打地鼠组件', () => {
  it('渲染棋盘与开始按钮', () => {
    render(<Tool />)
    expect(byTestId('mole-board')).toBeTruthy()
    expect(byTestId('mole-start')).toBeTruthy()
    expect(byTestId('mole-score').textContent).toContain('得分：0')
  })

  it('开始后敲击地鼠洞不报错', () => {
    vi.useFakeTimers()
    try {
      render(<Tool />)
      fireEvent.click(byTestId('mole-start'))
      fireEvent.click(byTestId('mole-hole-0'))
      expect(byTestId('mole-board')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })
})
