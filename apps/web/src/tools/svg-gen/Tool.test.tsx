// @vitest-environment jsdom
/**
 * svg-gen 组件测试
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

describe('svg-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-width')).toBeTruthy()
  })

  it('默认输出生成点阵 SVG', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('<svg')
    expect(out).toContain('<circle')
  })

  it('切换为网格输出 line', () => {
    const { container } = render(<Tool />)
    const patternSelect = container.querySelector('select') as HTMLSelectElement
    fireEvent.change(patternSelect, { target: { value: 'grid' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('<line')
    expect(out).not.toContain('<circle')
  })

  it('非法颜色进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-fgColor'), { target: { value: 'red' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('前景色格式非法')
  })

  it('间距越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-spacing'), { target: { value: '200' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('间距须在 5–100')
  })
})
