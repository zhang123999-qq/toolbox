// @vitest-environment jsdom
/**
 * function-plot 组件测试（#826）：表达式绘制与参数校验。
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

describe('function-plot · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('function-plot-canvas')).toBeTruthy()
  })

  it('默认绘制 x^2', () => {
    render(<Tool />)
    expect(byTestId('function-plot-detail').textContent).toContain('y = x^2')
  })

  it('非法表达式显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'y+1' } })
    expect(byTestId('function-plot-error').textContent).toContain('不支持的标识符')
  })

  it('非法区间显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-min'), { target: { value: 'abc' } })
    expect(byTestId('function-plot-error').textContent).toContain('最小值不是有效数字')
  })

  it('非整数采样点数显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-steps'), { target: { value: '2.5' } })
    expect(byTestId('function-plot-error').textContent).toContain('必须为整数')
  })

  it('修改表达式后重绘', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'sin(x)' } })
    expect(byTestId('function-plot-detail').textContent).toContain('y = sin(x)')
    expect(byTestId('function-plot-canvas')).toBeTruthy()
  })
})
