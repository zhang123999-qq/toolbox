// @vitest-environment jsdom
/**
 * math-formula 组件测试（#824）：公式选择与变量代入。
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

describe('math-formula · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认计算勾股定理 3,4 → 5', () => {
    render(<Tool />)
    const detail = byTestId('math-formula-detail').textContent ?? ''
    expect(detail).toContain('勾股定理')
    expect(detail).toContain('结果：5')
  })

  it('切换公式后按新变量计算', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'circle-area' },
    })
    fireEvent.change(byTestId('input'), { target: { value: 'r=2' } })
    expect(byTestId('math-formula-detail').textContent).toContain(`结果：${Math.PI * 4}`)
  })

  it('缺变量显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a=3' } })
    expect(byTestId('math-formula-error').textContent).toContain('缺少变量')
  })
})
