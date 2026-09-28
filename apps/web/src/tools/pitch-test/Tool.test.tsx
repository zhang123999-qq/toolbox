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

describe('音准测试组件', () => {
  it('渲染题目与播放按钮', () => {
    render(<Tool />)
    expect(byTestId('pt-round').textContent).toContain('第 1 / 5 题')
    expect(byTestId('pt-play1')).toBeTruthy()
    expect(byTestId('pt-play2')).toBeTruthy()
    expect(byTestId('pt-answer-higher')).toBeTruthy()
  })

  it('答完 5 题出结果', () => {
    render(<Tool />)
    for (let i = 0; i < 5; i++) {
      fireEvent.click(byTestId('pt-answer-same'))
    }
    const result = byTestId('pt-result')
    expect(result.textContent).toContain('答对')
    expect(result.textContent).toContain('正确率')
  })

  it('作答后显示反馈并进入下一题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('pt-answer-higher'))
    expect(byTestId('pt-feedback')).toBeTruthy()
    expect(byTestId('pt-round').textContent).toContain('第 2 / 5 题')
  })

  it('再测一次重置', () => {
    render(<Tool />)
    for (let i = 0; i < 5; i++) {
      fireEvent.click(byTestId('pt-answer-same'))
    }
    fireEvent.click(byTestId('pt-restart'))
    expect(byTestId('pt-round').textContent).toContain('第 1 / 5 题')
    expect(screen.queryByTestId('pt-result')).toBeNull()
  })
})
