// @vitest-environment jsdom
/**
 * high-contrast 组件测试（#737）：主题 CSS 生成与对比度报告。
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

describe('high-contrast · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['background', 'foreground', 'link-color', 'mode', 'css-output', 'contrast-report', 'theme-preview']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认黑白主题生成 CSS 与 AAA 报告', () => {
    render(<Tool />)
    const css = byTestId('css-output').textContent ?? ''
    expect(css).toContain('--hc-bg: #000000;')
    expect(css).toContain('forced-colors: active')
    expect(css).toContain('color: CanvasText;')
    const report = byTestId('contrast-report').textContent ?? ''
    expect(report).toContain('21.00:1')
    expect(report).toContain('AAA 通过')
  })

  it('forced 模式生成例外类', () => {
    render(<Tool />)
    fireEvent.change(byTestId('mode'), { target: { value: 'forced' } })
    expect(byTestId('css-output').textContent).toContain('.hc-force-only')
  })

  it('低对比度报告未通过', () => {
    render(<Tool />)
    fireEvent.change(byTestId('foreground'), { target: { value: '#eeeeee' } })
    fireEvent.change(byTestId('background'), { target: { value: '#ffffff' } })
    expect(byTestId('contrast-report').textContent).toContain('未通过')
  })

  it('非法颜色显示参数错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('link-color'), { target: { value: 'yellow' } })
    expect(byTestId('param-error').textContent).toContain('不合法')
    expect(screen.queryByTestId('css-output')).toBeNull()
  })

  it('预览区随颜色变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('background'), { target: { value: '#111111' } })
    const preview = byTestId('theme-preview')
    expect(preview.getAttribute('style')).toContain('background-color: rgb(17, 17, 17)')
  })
})
