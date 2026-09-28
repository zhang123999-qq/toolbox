// @vitest-environment jsdom
/**
 * extension-debug 组件测试（#783）：扩展问题诊断。
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

describe('extension-debug · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('extdebug-run')).toBeTruthy()
    expect(byTestId('extdebug-files')).toBeTruthy()
  })

  it('诊断示例 manifest 报出宽泛权限警告', () => {
    render(<Tool />)
    fireEvent.click(byTestId('extdebug-run'))
    expect(byTestId('extdebug-output').textContent).toContain('过于宽泛')
  })

  it('非法 JSON 输入报出错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    fireEvent.click(byTestId('extdebug-run'))
    expect(byTestId('extdebug-output').textContent).toContain('不是合法 JSON')
  })

  it('合法最小 manifest 通过诊断', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value: JSON.stringify({
          manifest_version: 3,
          name: 'a',
          version: '1.0.0',
          icons: { '128': 'icon128.png' },
        }),
      },
    })
    fireEvent.click(byTestId('extdebug-run'))
    expect(byTestId('extdebug-output').textContent).toContain('未声明 background')
  })
})
