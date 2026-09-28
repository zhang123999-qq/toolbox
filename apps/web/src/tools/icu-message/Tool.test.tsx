// @vitest-environment jsdom
/**
 * icu-message 组件测试：消息渲染与变量代入。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('icu-message · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'input-values', 'example', 'clear', 'output', 'copy', 'download', 'results']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例渲染复数消息', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-preview').textContent).toContain('5 条消息')
    expect(byTestId('result-placeholders').textContent).toContain('n')
  })

  it('修改变量后重新渲染', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-values'), { target: { value: '{"n": 1}' } })
    expect(byTestId('result-preview').textContent).toContain('一条消息')
  })

  it('变量取值非法 JSON 行内报错', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-values'), { target: { value: '{坏' } })
    expect(screen.getByRole('alert').textContent).toContain('JSON')
  })
})
