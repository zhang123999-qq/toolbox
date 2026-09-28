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

describe('手速测试组件', () => {
  it('渲染时长按钮与点击区', () => {
    render(<Tool />)
    expect(byTestId('cps-duration-5')).toBeTruthy()
    expect(byTestId('cps-duration-10')).toBeTruthy()
    expect(byTestId('cps-duration-30')).toBeTruthy()
    expect(byTestId('cps-pad').textContent).toContain('选择时长开始')
  })

  it('未开始时点击不计数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('cps-pad'))
    expect(screen.queryByTestId('cps-result')).toBeNull()
  })

  it('5 秒测试结束出 CPS 结果', () => {
    vi.useFakeTimers()
    render(<Tool />)
    fireEvent.click(byTestId('cps-duration-5'))
    expect(byTestId('cps-pad').textContent).toContain('点击！')
    fireEvent.click(byTestId('cps-pad'))
    fireEvent.click(byTestId('cps-pad'))
    fireEvent.click(byTestId('cps-pad'))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    const result = byTestId('cps-result')
    expect(result.textContent).toContain('CPS')
    expect(result.textContent).toContain('总点击 3 次')
    vi.useRealTimers()
  })

  it('结束后点击区不再计数', () => {
    vi.useFakeTimers()
    render(<Tool />)
    fireEvent.click(byTestId('cps-duration-5'))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    fireEvent.click(byTestId('cps-pad'))
    expect(byTestId('cps-result').textContent).toContain('总点击 0 次')
    vi.useRealTimers()
  })
})
