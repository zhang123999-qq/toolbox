// @vitest-environment jsdom
/**
 * api-log 组件测试（#765）：日志统计展示与非法行提示。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_LOG } from './utils'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('api-log · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('apilog-run')).toBeTruthy()
  })

  it('示例日志统计正确并提示跳过', () => {
    render(<Tool />)
    fireEvent.click(byTestId('apilog-run'))
    expect(byTestId('apilog-summary').textContent).toContain('共 4 条')
    expect(byTestId('apilog-summary').textContent).toContain('跳过 1 行非法')
    expect(byTestId('apilog-status').textContent).toContain('2xx: 3')
    expect(byTestId('apilog-table').querySelectorAll('tbody tr').length).toBeGreaterThan(0)
  })

  it('全非法日志显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'garbage line' } })
    fireEvent.click(byTestId('apilog-run'))
    expect(byTestId('apilog-error').textContent).toContain('未解析出任何有效日志行')
  })

  it('空输入不报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '' } })
    fireEvent.click(byTestId('apilog-run'))
    expect(screen.queryByTestId('apilog-error')).toBeNull()
  })

  it('示例日志常量非空', () => {
    expect(EXAMPLE_LOG.length).toBeGreaterThan(0)
  })
})
