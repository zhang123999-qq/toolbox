// @vitest-environment jsdom
/**
 * edge-log 组件测试（#819）：查询与解析模式。
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

describe('edge-log · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认生成 GraphQL 查询', () => {
    render(<Tool />)
    expect(byTestId('edge-log-code').textContent).toContain('httpRequests1hGroups')
    expect(byTestId('edge-log-detail').textContent).toContain('无过滤条件')
  })

  it('非法状态码显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byLabel('状态码'), { target: { value: '50' } })
    expect(byTestId('edge-log-error').textContent).toContain('状态码须为 3 位数字')
  })

  it('parse 模式解析示例日志行', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    expect(byTestId('edge-log-detail').textContent).toContain('#1 GET /index.html → 200')
  })

  it('parse 模式非法行显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    fireEvent.change(byTestId('input'), { target: { value: 'bad line' } })
    expect(byTestId('edge-log-error').textContent).toContain('第 1 行：无法识别的日志格式')
  })
})
