// @vitest-environment jsdom
/**
 * background 组件测试（#779）：Service Worker 模板生成。
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

describe('background · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('background-run')).toBeTruthy()
  })

  it('示例配置生成 background.js', () => {
    render(<Tool />)
    fireEvent.click(byTestId('background-run'))
    const out = byTestId('background-output').textContent ?? ''
    expect(out).toContain('chrome.runtime.onInstalled.addListener')
    expect(out).toContain('chrome.alarms.create')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"events":[]}' } })
    fireEvent.click(byTestId('background-run'))
    expect(byTestId('background-error').textContent).toContain('至少需要选择一个事件')
  })
})
