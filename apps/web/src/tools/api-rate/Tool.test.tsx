// @vitest-environment jsdom
/**
 * api-rate 组件测试（#762）：限流模拟展示与错误处理。
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

describe('api-rate · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('apirate-run')).toBeTruthy()
  })

  it('令牌桶模拟展示放行与拒绝', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value: JSON.stringify({
          mode: 'token-bucket',
          requests: [0, 0.1, 0.2, 0.3],
          capacity: 2,
          refillPerSec: 1,
          limit: 5,
          windowSec: 10,
        }),
      },
    })
    fireEvent.click(byTestId('apirate-run'))
    expect(byTestId('apirate-summary').textContent).toContain('令牌桶')
    expect(byTestId('apirate-summary').textContent).toContain('放行 2 / 4')
    expect(byTestId('apirate-table').querySelectorAll('tbody tr')).toHaveLength(4)
  })

  it('滑动窗口模拟展示结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value: JSON.stringify({
          mode: 'sliding-window',
          requests: [0, 1, 2, 3],
          capacity: 3,
          refillPerSec: 1,
          limit: 2,
          windowSec: 10,
        }),
      },
    })
    fireEvent.click(byTestId('apirate-run'))
    expect(byTestId('apirate-summary').textContent).toContain('滑动窗口')
    expect(byTestId('apirate-summary').textContent).toContain('放行 2 / 4')
  })

  it('非法 mode 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"mode":"x","requests":[0]}' },
    })
    fireEvent.click(byTestId('apirate-run'))
    expect(byTestId('apirate-error').textContent).toContain('mode 必须是')
  })
})
