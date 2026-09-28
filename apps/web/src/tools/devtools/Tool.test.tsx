// @vitest-environment jsdom
/**
 * devtools 组件测试（#782）：DevTools 面板模板生成与 manifest 校验。
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

describe('devtools · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('devtools-generate')).toBeTruthy()
    expect(byTestId('devtools-validate')).toBeTruthy()
    expect(byTestId('devtools-manifest')).toBeTruthy()
  })

  it('生成模板输出三个文件', () => {
    render(<Tool />)
    fireEvent.click(byTestId('devtools-generate'))
    const out = byTestId('devtools-output')
    expect(out.textContent).toContain('===== devtools.html =====')
    expect(out.textContent).toContain('chrome.devtools.panels.create')
  })

  it('校验合法 manifest 通过', () => {
    render(<Tool />)
    fireEvent.click(byTestId('devtools-validate'))
    expect(byTestId('devtools-output').textContent).toContain('声明合法')
  })

  it('校验非法 manifest 报出问题', () => {
    render(<Tool />)
    fireEvent.change(byTestId('devtools-manifest'), { target: { value: '{"manifest_version":2}' } })
    fireEvent.click(byTestId('devtools-validate'))
    expect(byTestId('devtools-output').textContent).toContain('发现')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad json' } })
    fireEvent.click(byTestId('devtools-generate'))
    expect(byTestId('devtools-error').textContent).toContain('不是合法 JSON')
  })
})
