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

describe('反应测试组件', () => {
  it('渲染测试区与开始按钮', () => {
    render(<Tool />)
    expect(byTestId('reaction-pad').textContent).toContain('点击开始')
    expect(byTestId('reaction-start')).toBeTruthy()
  })

  it('等待期点击判抢跑', () => {
    vi.useFakeTimers()
    render(<Tool />)
    fireEvent.click(byTestId('reaction-start'))
    expect(byTestId('reaction-pad').textContent).toContain('等待变绿')
    fireEvent.click(byTestId('reaction-pad'))
    expect(byTestId('reaction-foul')).toBeTruthy()
    vi.useRealTimers()
  })

  it('变绿后点击记录反应时间', () => {
    vi.useFakeTimers()
    render(<Tool />)
    fireEvent.click(byTestId('reaction-start'))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(byTestId('reaction-pad').textContent).toContain('点击！')
    fireEvent.click(byTestId('reaction-pad'))
    const result = byTestId('reaction-result')
    expect(result.textContent).toContain('反应时间')
    expect(result.textContent).toContain('ms')
    expect(screen.queryByTestId('reaction-foul')).toBeNull()
    vi.useRealTimers()
  })
})
