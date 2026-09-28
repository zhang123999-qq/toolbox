// @vitest-environment jsdom
/**
 * api-mock 组件测试（#743）：路由规则编辑与模拟请求匹配。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('api-mock · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['routes', 'request-body', 'mock-result']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认请求命中示例路由并渲染模板', () => {
    render(<Tool />)
    const text = byTestId('mock-result').textContent ?? ''
    expect(text).toContain('命中路由 #1')
    expect(text).toContain('"id": "123"')
    expect(text).toContain('"active": "true"')
  })

  it('非法路由 JSON 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('routes'), { target: { value: '{bad' } })
    expect(byTestId('mock-error').textContent).toContain('不是合法 JSON')
    expect(screen.queryByTestId('mock-result')).toBeNull()
  })

  it('无匹配路由显示提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'GET /nothing-here' } })
    expect(byTestId('mock-result').textContent).toContain('无匹配的 mock 路由')
  })

  it('请求体占位可被渲染', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'POST /users' } })
    fireEvent.change(byTestId('request-body'), { target: { value: '{"name":"Tom"}' } })
    expect(byTestId('mock-result').textContent).toContain('"name": "Tom"')
  })

  it('非法请求体显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('request-body'), { target: { value: '{' } })
    expect(byTestId('mock-error').textContent).toContain('请求体不是合法 JSON')
  })
})
