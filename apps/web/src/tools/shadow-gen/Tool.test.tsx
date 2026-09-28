// @vitest-environment jsdom
/**
 * shadow-gen 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('shadow-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-layers')).toBeTruthy()
  })

  it('默认空输入生成柔和阴影', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('box-shadow: 0px 10px 20px 0px')
  })

  it('切到霓虹样式并点示例后输出发光色', () => {
    const { container } = render(<Tool />)
    const styleSelect = container.querySelector('select') as HTMLSelectElement
    fireEvent.change(styleSelect, { target: { value: 'neon' } })
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('#00e5ff')
  })

  it('层数越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-layers'), { target: { value: '9' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('须在 1–5')
  })

  it('非法基础色进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not a color' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('基础色格式非法')
  })
})
