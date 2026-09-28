// @vitest-environment jsdom
/**
 * edge-auth 组件测试（#818）：三种模式切换。
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

describe('edge-auth · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认生成 Basic Auth Worker 代码', () => {
    render(<Tool />)
    expect(byTestId('edge-auth-code').textContent).toContain('Basic realm="admin-area"')
  })

  it('realm 为空显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byLabel('realm'), { target: { value: '  ' } })
    expect(byTestId('edge-auth-error').textContent).toContain('realm 不能为空')
  })

  it('jwt 模式生成校验片段', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'jwt' } })
    expect(byTestId('edge-auth-code').textContent).toContain('verifyJwt')
  })

  it('jwt 模式非法 JWKS 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'jwt' } })
    fireEvent.change(byLabel('JWKS 地址'), { target: { value: 'http://a.com/j' } })
    expect(byTestId('edge-auth-error').textContent).toContain('JWKS 地址须为 https URL')
  })

  it('parse 模式解析示例 Basic 头', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    expect(byTestId('edge-auth-detail').textContent).toContain('用户名：user')
  })
})
