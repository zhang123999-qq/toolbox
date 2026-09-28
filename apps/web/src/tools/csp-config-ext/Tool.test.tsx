// @vitest-environment jsdom
/**
 * csp-config-ext 组件测试（#777）：CSP 策略生成与校验。
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

describe('csp-config-ext · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('cspconfig-generate')).toBeTruthy()
    expect(byTestId('cspconfig-validate')).toBeTruthy()
  })

  it('生成预设策略', () => {
    render(<Tool />)
    fireEvent.click(byTestId('cspconfig-generate'))
    const out = byTestId('cspconfig-output')
    expect(out.textContent).toContain("script-src 'self'")
  })

  it('生成并校验输出无问题结论', () => {
    render(<Tool />)
    fireEvent.click(byTestId('cspconfig-validate'))
    expect(byTestId('cspconfig-output').textContent).toContain('策略合法')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad json' } })
    fireEvent.click(byTestId('cspconfig-generate'))
    expect(byTestId('cspconfig-error').textContent).toContain('不是合法 JSON')
  })
})
