// @vitest-environment jsdom
/**
 * personality 组件测试（#838）：MBTI 问卷交互。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { QUESTIONS } from './utils'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

function answerAll(v: 'a' | 'b'): void {
  for (const q of QUESTIONS) {
    fireEvent.click(byTestId(`personality-q-${q.id}-${v}`))
  }
}

describe('personality · Tool', () => {
  it('渲染 16 道题', () => {
    render(<Tool />)
    for (const q of QUESTIONS) {
      expect(byTestId(`personality-q-${q.id}-a`)).toBeTruthy()
      expect(byTestId(`personality-q-${q.id}-b`)).toBeTruthy()
    }
  })

  it('未答完提交显示中文错误', () => {
    render(<Tool />)
    fireEvent.click(byTestId('personality-q-q1-a'))
    fireEvent.click(byTestId('personality-submit'))
    expect(byTestId('personality-error').textContent).toContain('还有 15 道题未作答')
  })

  it('全选 A 显示 ESTJ 结果', () => {
    render(<Tool />)
    answerAll('a')
    fireEvent.click(byTestId('personality-submit'))
    expect(byTestId('personality-result').textContent).toContain('ESTJ')
    expect(byTestId('personality-result').textContent).toContain('总经理')
  })

  it('全选 B 显示 INFP 结果', () => {
    render(<Tool />)
    answerAll('b')
    fireEvent.click(byTestId('personality-submit'))
    expect(byTestId('personality-result').textContent).toContain('INFP')
  })

  it('重新测试清空答案与结果', () => {
    render(<Tool />)
    answerAll('a')
    fireEvent.click(byTestId('personality-submit'))
    expect(byTestId('personality-result').textContent).toContain('ESTJ')
    fireEvent.click(byTestId('personality-retake'))
    expect(screen.queryByTestId('personality-result')).toBeNull()
    expect((byTestId('personality-q-q1-a') as HTMLInputElement).checked).toBe(false)
  })
})
