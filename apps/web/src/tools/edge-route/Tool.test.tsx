// @vitest-environment jsdom
/**
 * edge-route 组件测试（#812）：路由匹配展示与错误提示。
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

describe('edge-route · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'input-url', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认示例命中 static-assets', () => {
    render(<Tool />)
    expect(byTestId('edge-route-target').textContent).toBe('static-assets')
    expect(byTestId('edge-route-detail').textContent).toContain('example.com/static/*')
  })

  it('修改 URL 后重新匹配', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-url'), { target: { value: 'https://example.com/api/users' } })
    expect(byTestId('edge-route-target').textContent).toBe('users-api')
  })

  it('无命中显示提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-url'), { target: { value: 'https://other.org/' } })
    expect(byTestId('edge-route-target').textContent).toBe('无命中')
  })

  it('URL 为空显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-url'), { target: { value: '' } })
    expect(byTestId('edge-route-error').textContent).toContain('请输入待测试的 URL')
  })

  it('规则格式非法显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'badline' } })
    expect(byTestId('edge-route-error').textContent).toContain('第 1 行格式非法')
  })
})
