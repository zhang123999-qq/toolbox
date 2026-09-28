// @vitest-environment jsdom
/**
 * physics-formula 组件测试（#822）：速查与代入计算。
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

describe('physics-formula · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认计算牛顿第二定律', () => {
    render(<Tool />)
    expect(byTestId('physics-formula-detail').textContent).toContain('计算结果：6')
  })

  it('缺变量显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'm=2' } })
    expect(byTestId('physics-formula-error').textContent).toContain('缺少变量 a（加速度，单位 m/s²）')
  })

  it('赋值格式非法显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'm2' } })
    expect(byTestId('physics-formula-error').textContent).toContain('赋值行格式非法')
  })

  it('lookup 模式列出公式目录', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'lookup' } })
    expect(byTestId('physics-formula-detail').textContent).toContain('ohm：欧姆定律')
  })
})
