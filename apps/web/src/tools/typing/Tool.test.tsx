// @vitest-environment jsdom
/**
 * typing 组件测试（#831）：速度与准确率统计。
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

describe('typing · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'input-typed', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('全对输入显示 100% 准确率', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-typed'), {
      target: { value: 'The quick brown fox jumps over the lazy dog.' },
    })
    const detail = byTestId('typing-detail').textContent ?? ''
    expect(detail).toContain('准确率：100%')
    expect(detail).toContain('无错误')
  })

  it('错字显示错误定位', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'hello' } })
    fireEvent.change(byTestId('input-typed'), { target: { value: 'hallo' } })
    const detail = byTestId('typing-detail').textContent ?? ''
    expect(detail).toContain('准确率：80%')
    expect(detail).toContain('#2 应为「e」，实为「a」')
  })

  it('非法用时显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-seconds'), { target: { value: 'abc' } })
    expect(byTestId('typing-error').textContent).toContain('用时不是有效数字')
  })

  it('WPM 随用时变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'hello' } })
    fireEvent.change(byTestId('input-typed'), { target: { value: 'hello' } })
    fireEvent.change(byTestId('option-seconds'), { target: { value: '30' } })
    expect(byTestId('typing-detail').textContent).toContain('速度：2 WPM')
  })
})
