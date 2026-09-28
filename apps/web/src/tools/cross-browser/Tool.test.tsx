// @vitest-environment jsdom
/**
 * cross-browser 组件测试（#778）：垫片生成与兼容性扫描。
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

describe('cross-browser · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('crossbrowser-run')).toBeTruthy()
  })

  it('默认 polyfill 输入生成垫片代码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('crossbrowser-run'))
    expect(byTestId('crossbrowser-output').textContent).toContain('function storageSyncGet')
  })

  it('scan 示例输入输出兼容性建议', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('crossbrowser-run'))
    expect(byTestId('crossbrowser-output').textContent).toContain('tabs.query')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not json' } })
    fireEvent.click(byTestId('crossbrowser-run'))
    expect(byTestId('crossbrowser-error').textContent).toContain('不是合法 JSON')
  })
})
