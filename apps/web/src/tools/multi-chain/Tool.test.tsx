// @vitest-environment jsdom
/**
 * multi-chain 组件测试：示例转换渲染与非法输入行内报错。
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

describe('multi-chain · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download', 'results']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例自动识别 ETH→TRON', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('value-output').textContent).toBe('TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t')
  })

  it('输入 TRON 地址转回 ETH', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' } })
    expect(byTestId('value-output').textContent).toBe('0xa614f803b6fd780986a42c78ec9c7f77e6ded13c')
  })

  it('非法地址行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'hello' } })
    expect(byTestId('output').textContent).toContain('base58 非法字符')
  })
})
