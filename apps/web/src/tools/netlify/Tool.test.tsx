// @vitest-environment jsdom
/**
 * netlify 组件测试（#815）：校验展示与错误提示。
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

describe('netlify · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认示例校验通过并显示摘要', () => {
    render(<Tool />)
    expect(byTestId('netlify-summary').textContent).toContain('redirects 1 条')
    expect(byTestId('netlify-toml').textContent).toContain('[[redirects]]')
  })

  it('不支持的节显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[plugins]' } })
    expect(byTestId('netlify-error').textContent).toContain('不支持的节')
  })

  it('路径非法显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '[[redirects]]\n  from = "old"\n  to = "/new"\n  status = 301' },
    })
    expect(byTestId('netlify-error').textContent).toContain('必须以 / 开头')
  })
})
