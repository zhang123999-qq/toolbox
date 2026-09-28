// @vitest-environment jsdom
/**
 * bitmap-font 组件测试（#796）：字体位图。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('bitmap-font · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'bitmapfont-text',
      'bitmapfont-font',
      'bitmapfont-size',
      'bitmapfont-run',
      'bitmapfont-format',
      'bitmapfont-download',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('下载按钮初始禁用', () => {
    render(<Tool />)
    expect((byTestId('bitmapfont-download') as HTMLButtonElement).disabled).toBe(true)
  })

  it('非法字号显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('bitmapfont-size'), { target: { value: '7' } })
    fireEvent.click(byTestId('bitmapfont-run'))
    expect(byTestId('bitmapfont-error').textContent).toContain('字号')
  })

  it('空文本显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('bitmapfont-text'), { target: { value: '' } })
    fireEvent.click(byTestId('bitmapfont-run'))
    expect(byTestId('bitmapfont-error').textContent).toContain('文本不能为空')
  })

  it('切换导出格式', () => {
    render(<Tool />)
    fireEvent.change(byTestId('bitmapfont-format'), { target: { value: 'c' } })
    expect((byTestId('bitmapfont-format') as HTMLSelectElement).value).toBe('c')
  })
})
