// @vitest-environment jsdom
/**
 * tx-build 组件测试：示例构建渲染与非法输入错误态。
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

describe('tx-build · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download', 'results']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例构建 Legacy 交易', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('value-type').textContent).toBe('Legacy')
    expect(byTestId('value-nonce').textContent).toBe('7')
    expect(byTestId('value-chainId').textContent).toBe('1')
    expect(byTestId('value-rlp').textContent).toMatch(/^0x[0-9a-f]+$/)
  })

  it('非法 to 地址行内报错', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-to'), { target: { value: '0x123' } })
    expect(byTestId('output').textContent).toContain('to 地址格式非法')
  })

  it('清空后回退示例可渲染', () => {
    render(<Tool />)
    fireEvent.click(byTestId('clear'))
    expect(byTestId('value-type').textContent).toBe('Legacy')
  })
})
