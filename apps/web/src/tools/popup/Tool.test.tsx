// @vitest-environment jsdom
/**
 * popup 组件测试（#780）：Popup 三文件模板生成。
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

describe('popup · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('popup-run')).toBeTruthy()
  })

  it('示例配置生成三文件模板', () => {
    render(<Tool />)
    fireEvent.click(byTestId('popup-run'))
    const out = byTestId('popup-output').textContent ?? ''
    expect(out).toContain('===== popup.html =====')
    expect(out).toContain('===== popup.js =====')
    expect(out).toContain('===== popup.css =====')
    expect(out).toContain('我的扩展')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"title":"t","width":9999,"height":10,"features":[]}' } })
    fireEvent.click(byTestId('popup-run'))
    expect(byTestId('popup-error').textContent).toContain('width 超出范围')
  })
})
