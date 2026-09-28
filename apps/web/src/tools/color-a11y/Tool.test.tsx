// @vitest-environment jsdom
/**
 * color-a11y 组件测试：色盲模拟渲染与判定。
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

describe('color-a11y · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-bg',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'results',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例白底黑字判定色盲安全', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-verdict').textContent).toContain('色盲安全')
    expect(byTestId('result-normal').textContent).toContain('21')
  })

  it('红绿配色判定不安全', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '#ff0000' } })
    fireEvent.change(byTestId('input-bg'), { target: { value: '#00ff00' } })
    expect(byTestId('result-verdict').textContent).toContain('不安全')
  })

  it('非法颜色行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '不是颜色' } })
    expect(screen.getByRole('alert').textContent).toContain('无法解析')
  })
})
