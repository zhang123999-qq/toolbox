// @vitest-environment jsdom
/**
 * edge-redirect 组件测试（#817）：生成与解析模式。
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

function byLabel(label: string): HTMLElement {
  const el = screen.queryByLabelText(label)
  if (!el) throw new Error('缺少 label="' + label + '" 的控件')
  return el as HTMLElement
}

describe('edge-redirect · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认生成示例规则 JSON', () => {
    render(<Tool />)
    expect(byTestId('edge-redirect-json').textContent).toContain('"source_url": "https://old.example.com/*"')
    expect(byTestId('edge-redirect-summary').textContent).toContain('（301）')
  })

  it('目标非法显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byLabel('目标（to）'), { target: { value: 'not-url' } })
    expect(byTestId('edge-redirect-error').textContent).toContain('目标地址格式非法')
  })

  it('parse 模式解析左侧 JSON', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    fireEvent.change(byTestId('input'), {
      target: { value: '[{"from":"/a","to":"https://b.com","status":302}]' },
    })
    expect(byTestId('edge-redirect-summary').textContent).toContain('/a → https://b.com（302）')
  })

  it('parse 模式非法 JSON 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    expect(byTestId('edge-redirect-error').textContent).toContain('输入不是合法 JSON')
  })
})
