// @vitest-environment jsdom
/**
 * chemistry 组件测试（#823）：配平 / 摩尔质量 / 解析三种模式。
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

describe('chemistry · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认配平 H2+O2=H2O', () => {
    render(<Tool />)
    expect(byTestId('chemistry-detail').textContent).toContain('2H2 + O2 = 2H2O')
  })

  it('非法方程式显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'H2+O2' } })
    expect(byTestId('chemistry-error').textContent).toContain('需要用 = 或 -> 分隔')
  })

  it('molar 模式计算摩尔质量', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'molar' } })
    fireEvent.change(byTestId('input'), { target: { value: 'NaCl' } })
    expect(byTestId('chemistry-detail').textContent).toContain('58.44 g/mol')
  })

  it('parse 模式解析化学式', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    fireEvent.change(byTestId('input'), { target: { value: 'H2SO4' } })
    const detail = byTestId('chemistry-detail').textContent ?? ''
    expect(detail).toContain('H:2')
    expect(detail).toContain('S:1')
    expect(detail).toContain('O:4')
  })
})
