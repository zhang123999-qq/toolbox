// @vitest-environment jsdom
/**
 * permission 组件测试（#776）：权限清单生成。
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

describe('permission · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('permission-run')).toBeTruthy()
  })

  it('示例输入生成权限片段', () => {
    render(<Tool />)
    fireEvent.click(byTestId('permission-run'))
    const out = JSON.parse(byTestId('permission-output').textContent ?? '')
    expect(out.permissions).toEqual(['storage', 'activeTab', 'scripting'])
    expect(out.host_permissions).toEqual(['https://api.example.com/*'])
  })

  it('权限字典渲染', () => {
    render(<Tool />)
    expect(document.body.textContent).toContain('读写浏览器 Cookie')
    expect(document.body.textContent).toContain('高风险')
  })

  it('未知权限报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"permissions":["hack"],"hostPermissions":[]}' },
    })
    fireEvent.click(byTestId('permission-run'))
    expect(byTestId('permission-error').textContent).toContain('未知权限：hack')
  })

  it('空 hostPermissions 不输出该字段', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"permissions":["storage"],"hostPermissions":[]}' },
    })
    fireEvent.click(byTestId('permission-run'))
    const out = JSON.parse(byTestId('permission-output').textContent ?? '')
    expect(out.host_permissions).toBeUndefined()
  })
})
