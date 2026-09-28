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

describe('记忆游戏组件', () => {
  it('渲染牌组、步数与重新开始按钮', () => {
    render(<Tool />)
    expect(byTestId('memory-board').children).toHaveLength(12)
    expect(byTestId('memory-moves').textContent).toContain('0')
    expect(byTestId('memory-new')).toBeTruthy()
  })

  it('翻牌计步，两张不同结算后翻回', () => {
    vi.useFakeTimers()
    render(<Tool />)
    fireEvent.click(byTestId('memory-card-0'))
    fireEvent.click(byTestId('memory-card-1'))
    expect(byTestId('memory-moves').textContent).toContain('2')
    act(() => {
      vi.advanceTimersByTime(800)
    })
    // 结算后步数不变，未完成提示不出现
    expect(byTestId('memory-moves').textContent).toContain('2')
    expect(screen.queryByTestId('memory-done')).toBeNull()
    vi.useRealTimers()
  })

  it('切换对数重建牌组', () => {
    render(<Tool />)
    fireEvent.change(byTestId('memory-pairs'), { target: { value: '4' } })
    expect(byTestId('memory-board').children).toHaveLength(8)
    expect(byTestId('memory-moves').textContent).toContain('0')
  })
})
