// @vitest-environment jsdom
/**
 * exp-curve 组件测试（#805）：经验曲线。
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

describe('exp-curve · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('exp-table')).toBeTruthy()
    expect(byTestId('exp-lookup')).toBeTruthy()
  })

  it('生成经验表', () => {
    render(<Tool />)
    fireEvent.change(byTestId('exp-maxlevel'), { target: { value: '3' } })
    fireEvent.click(byTestId('exp-table'))
    const out = byTestId('exp-output').textContent ?? ''
    expect(out).toContain('Lv.1')
    expect(out).toContain('Lv.3')
  })

  it('反查等级', () => {
    render(<Tool />)
    fireEvent.change(byTestId('exp-totalexp'), { target: { value: '250' } })
    fireEvent.click(byTestId('exp-lookup'))
    expect(byTestId('exp-output').textContent).toContain('Lv.3')
  })

  it('切换指数模式生成表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('exp-mode-exponential'))
    fireEvent.change(byTestId('input'), { target: { value: '{"base":100,"growth":2}' } })
    fireEvent.change(byTestId('exp-maxlevel'), { target: { value: '2' } })
    fireEvent.click(byTestId('exp-table'))
    expect(byTestId('exp-output').textContent).toContain('Lv.2')
  })

  it('非法 JSON 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xxx' } })
    fireEvent.click(byTestId('exp-table'))
    expect(byTestId('exp-error').textContent).toContain('合法 JSON')
  })
})
