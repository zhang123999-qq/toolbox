// @vitest-environment jsdom
/**
 * grid-gen 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('grid-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('图案')).toBeTruthy()
  })

  it('默认空输入渲染出 SVG 点阵', () => {
    render(<Tool />)
    const output = byTestId('output')
    expect(output.querySelector('svg')).toBeTruthy()
    expect(output.querySelector('circle')).toBeTruthy()
  })

  it('切换图案为 lines 渲染出线框', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('图案'), { target: { value: 'lines' } })
    expect(byTestId('output').querySelector('line')).toBeTruthy()
  })

  it('间距越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-spacing'), { target: { value: '1' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('间距须在 5–100')
  })

  it('非法颜色进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-fgColor'), { target: { value: 'red' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('前景色格式非法')
  })
})
