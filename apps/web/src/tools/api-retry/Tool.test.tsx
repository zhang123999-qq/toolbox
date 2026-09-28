// @vitest-environment jsdom
/**
 * api-retry 组件测试（#760）：重试时间表计算与错误展示。
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

describe('api-retry · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('apiretry-run')).toBeTruthy()
  })

  it('计算时间表并展示累计', () => {
    render(<Tool />)
    fireEvent.click(byTestId('apiretry-run'))
    const table = byTestId('apiretry-table')
    expect(table.querySelectorAll('tbody tr')).toHaveLength(5)
    expect(byTestId('apiretry-total').textContent).toContain('最坏总等待')
  })

  it('非法 JSON 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{' } })
    fireEvent.click(byTestId('apiretry-run'))
    expect(byTestId('apiretry-error').textContent).toContain('不是合法 JSON')
  })

  it('非法参数显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value: '{"baseDelayMs":0,"multiplier":2,"maxDelayMs":8000,"maxRetries":3}',
      },
    })
    fireEvent.click(byTestId('apiretry-run'))
    expect(byTestId('apiretry-error').textContent).toContain('初始延迟必须是正整数')
  })
})
