// @vitest-environment jsdom
/**
 * blob-gen 组件测试
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

describe('blob-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-complexity')).toBeTruthy()
  })

  it('默认空输入渲染出 SVG blob', () => {
    render(<Tool />)
    const output = byTestId('output')
    expect(output.querySelector('svg')).toBeTruthy()
    expect(output.querySelector('path')).toBeTruthy()
  })

  it('点示例后仍渲染 SVG', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').querySelector('svg')).toBeTruthy()
  })

  it('复杂度越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-complexity'), { target: { value: '99' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('复杂度须在 3–12')
  })

  it('非法填充色进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-fillColor'), { target: { value: 'red' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('填充色格式非法')
  })
})
