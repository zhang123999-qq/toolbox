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

function answer(digit: string) {
  fireEvent.change(byTestId('cbt-input'), { target: { value: digit } })
  fireEvent.click(byTestId('cbt-next'))
}

describe('色盲测试组件', () => {
  it('渲染第一图与画布', () => {
    render(<Tool />)
    expect(byTestId('cbt-label').textContent).toContain('第一图')
    expect(byTestId('cbt-canvas')).toBeTruthy()
  })

  it('走完 5 图出结果', () => {
    render(<Tool />)
    answer('12')
    expect(byTestId('cbt-label').textContent).toContain('第二图')
    answer('6')
    answer('74')
    answer('2')
    answer('5')
    const result = byTestId('cbt-result')
    expect(result.textContent).toContain('答对 5 / 5')
    expect(result.textContent).toContain('色觉正常')
  })

  it('答错影响得分', () => {
    render(<Tool />)
    answer('99')
    answer('99')
    answer('99')
    answer('99')
    answer('99')
    expect(byTestId('cbt-result').textContent).toContain('答对 0 / 5')
  })

  it('再测一次重置', () => {
    render(<Tool />)
    answer('12')
    answer('6')
    answer('74')
    answer('2')
    answer('5')
    fireEvent.click(byTestId('cbt-restart'))
    expect(byTestId('cbt-label').textContent).toContain('第一图')
  })
})
