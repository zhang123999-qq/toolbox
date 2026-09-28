// @vitest-environment jsdom
/**
 * focus-style 组件测试（#735）：参数实时生成 CSS 与预览。
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

describe('focus-style · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['color', 'bg', 'width', 'offset', 'radius', 'outline-style', 'css-output', 'contrast-result', 'demo-button', 'demo-link', 'demo-input']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成标准 CSS 与对比度结论', () => {
    render(<Tool />)
    const css = byTestId('css-output').textContent ?? ''
    expect(css).toContain('outline: 2px solid #2563eb;')
    expect(css).toContain('prefers-reduced-motion')
    expect(byTestId('contrast-result').textContent).toContain('通过')
  })

  it('修改宽度实时更新 CSS', () => {
    render(<Tool />)
    fireEvent.change(byTestId('width'), { target: { value: '4' } })
    expect(byTestId('css-output').textContent).toContain('outline: 4px solid #2563eb;')
  })

  it('修改描边样式实时更新', () => {
    render(<Tool />)
    fireEvent.change(byTestId('outline-style'), { target: { value: 'dashed' } })
    expect(byTestId('css-output').textContent).toContain('2px dashed #2563eb')
  })

  it('非法颜色显示参数错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('color'), { target: { value: 'red' } })
    expect(byTestId('param-error').textContent).toContain('不合法')
    expect(screen.queryByTestId('css-output')).toBeNull()
  })

  it('低对比度显示未通过', () => {
    render(<Tool />)
    fireEvent.change(byTestId('color'), { target: { value: '#ffffff' } })
    expect(byTestId('contrast-result').textContent).toContain('未通过')
  })

  it('越界宽度显示参数错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('width'), { target: { value: '99' } })
    expect(byTestId('param-error').textContent).toContain('超出范围')
  })
})
