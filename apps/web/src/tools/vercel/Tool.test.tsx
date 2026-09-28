// @vitest-environment jsdom
/**
 * vercel 组件测试（#814）：校验展示与错误提示。
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

describe('vercel · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认示例校验通过并显示摘要', () => {
    render(<Tool />)
    expect(byTestId('vercel-summary').textContent).toContain('rewrites 1 条')
    expect(byTestId('vercel-json').textContent).toContain('"redirects"')
  })

  it('非法 JSON 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    expect(byTestId('vercel-error').textContent).toContain('JSON 解析失败')
  })

  it('路径非法显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"rewrites":[{"source":"api","destination":"/x"}]}' },
    })
    expect(byTestId('vercel-error').textContent).toContain('必须以 / 开头')
  })
})
