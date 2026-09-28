// @vitest-environment jsdom
/**
 * form-a11y 组件测试：表单检查渲染与错误提示。
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

describe('form-a11y · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例检出缺少标签问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('缺少标签')
    expect(out).toContain('[错误]')
  })

  it('完美表单输出无问题', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '<form><label for="n">姓名</label><input id="n"><button type="submit">Go</button></form>' },
    })
    expect(byTestId('output').textContent).toContain('未发现无障碍问题')
  })
})
