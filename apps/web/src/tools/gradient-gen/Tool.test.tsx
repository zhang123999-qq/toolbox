// @vitest-environment jsdom
/**
 * gradient-gen 组件测试
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

describe('gradient-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-angle')).toBeTruthy()
  })

  it('默认空输入不报错，直接生成渐变 CSS', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('linear-gradient')
  })

  it('点示例输出指定颜色', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('background: linear-gradient(135deg, #ff5b8a, #6a5cff);')
  })

  it('非法颜色进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '#notacolor' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('颜色格式非法')
  })

  it('角度越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-angle'), { target: { value: '999' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('0–360')
  })
})
