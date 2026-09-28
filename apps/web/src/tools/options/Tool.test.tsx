// @vitest-environment jsdom
/**
 * options 组件测试（#781）：Options 选项页模板生成。
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

describe('options · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('options-run')).toBeTruthy()
  })

  it('示例字段生成选项页模板', () => {
    render(<Tool />)
    fireEvent.click(byTestId('options-run'))
    const out = byTestId('options-output').textContent ?? ''
    expect(out).toContain('===== options.html =====')
    expect(out).toContain('===== options.js =====')
    expect(out).toContain('chrome.storage.sync')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"fields":[]}' } })
    fireEvent.click(byTestId('options-run'))
    expect(byTestId('options-error').textContent).toContain('至少需要一个选项字段')
  })
})
