// @vitest-environment jsdom
/**
 * userscript-debug 组件测试（#785）：油猴脚本扫描。
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

describe('userscript-debug · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('usdebug-run')).toBeTruthy()
  })

  it('扫描示例脚本无问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('usdebug-run'))
    expect(byTestId('usdebug-output').textContent).toContain('未发现问题')
  })

  it('扫描问题脚本报出错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'GM_getValue("k");' } })
    fireEvent.click(byTestId('usdebug-run'))
    expect(byTestId('usdebug-output').textContent).toContain('==UserScript==')
  })
})
