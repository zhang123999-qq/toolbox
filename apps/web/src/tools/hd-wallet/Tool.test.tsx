// @vitest-environment jsdom
/**
 * hd-wallet 组件测试：批量派生的渲染与错误态。
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

describe('hd-wallet · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例种子派生出首地址 0x022b971dFF0C43305e691DEd7a14367AF19D6407', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('address-0').textContent).toBe('0x022b971dFF0C43305e691DEd7a14367AF19D6407')
    expect(byTestId('entry-4')).toBeTruthy()
  })

  it('非法种子行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'zzzz' } })
    expect(byTestId('output').textContent).toContain('种子格式错误')
  })

  it('序号非法行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-from'), { target: { value: 'abc' } })
    expect(byTestId('output').textContent).toContain('序号须为整数')
  })
})
