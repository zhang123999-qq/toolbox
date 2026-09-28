// @vitest-environment jsdom
/**
 * chart-gen 组件测试：echarts 依赖真实 DOM 度量，jsdom 下用 vi.mock 替换，
 * 聚焦输入校验、错误态与容器渲染。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_CSV } from './utils'

const dispose = vi.fn()
const setOption = vi.fn()
const init = vi.fn(() => ({ dispose, setOption }))

vi.mock('echarts', () => ({
  init,
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('chart-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('点示例填入 CSV 并渲染图表容器', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_CSV)
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('非法 CSV 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '只有一行' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('至少需要一行表头')
  })

  it('尺寸越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-width'), { target: { value: '10' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('宽度须在 100–2000')
  })

  it('卸载时 dispose 图表实例', async () => {
    const { unmount } = render(<Tool />)
    // 等待动态 import + init 完成
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    unmount()
    expect(dispose).toHaveBeenCalled()
  })
})
