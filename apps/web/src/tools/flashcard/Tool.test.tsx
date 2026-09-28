// @vitest-environment jsdom
/**
 * flashcard 组件测试（#830）：学习流程与牌组模式。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('flashcard · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('学习模式默认展示第一张卡片正面', () => {
    render(<Tool />)
    expect(byTestId('flashcard-front').textContent).toBe('apple')
    expect(byTestId('flashcard-progress').textContent).toContain('剩余 3 张')
  })

  it('点击显示答案后可评分并进入下一张', () => {
    render(<Tool />)
    fireEvent.click(byTestId('flashcard-show'))
    expect(byTestId('flashcard-back').textContent).toBe('苹果')
    fireEvent.click(byTestId('flashcard-grade-5'))
    expect(byTestId('flashcard-front').textContent).toBe('book')
  })

  it('全部评分后显示完成', () => {
    render(<Tool />)
    for (let i = 0; i < 3; i += 1) {
      fireEvent.click(byTestId('flashcard-show'))
      fireEvent.click(byTestId('flashcard-grade-4'))
    }
    expect(byTestId('flashcard-done').textContent).toContain('学习完成')
  })

  it('stats 模式展示统计', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'stats' } })
    expect(byTestId('flashcard-detail').textContent).toContain('共 3 张卡片')
  })

  it('due 模式列出到期卡片', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'due' } })
    const detail = byTestId('flashcard-detail').textContent ?? ''
    expect(detail).toContain('apple → 苹果')
  })

  it('非法 CSV 在 due 模式显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'due' } })
    fireEvent.change(byTestId('input'), { target: { value: 'no-comma-here' } })
    expect(byTestId('flashcard-error').textContent).toContain('缺少逗号分隔')
  })

  it('非法 CSV 在学习模式显示空牌组提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'no-comma-here' } })
    expect(byTestId('flashcard-empty').textContent).toContain('格式错误')
  })
})
