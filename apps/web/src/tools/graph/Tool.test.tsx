// @vitest-environment jsdom
/**
 * graph 组件测试：echarts 依赖真实 DOM 度量，jsdom 下用 vi.mock 替换，
 * 聚焦输入校验、错误态、PNG 下载与容器渲染。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_EDGES, EXAMPLE_NODES } from './utils'

const dispose = vi.fn()
const setOption = vi.fn()
const getDataURL = vi.fn(() => 'data:image/png;base64,AAA')
const init = vi.fn(() => ({ dispose, setOption, getDataURL }))

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

describe('graph · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-edgeText',
      'run',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'download-png',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('点示例同时填入节点与边', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_NODES)
    expect((byTestId('input-edgeText') as HTMLTextAreaElement).value).toBe(EXAMPLE_EDGES)
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('边引用未定义节点进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '节点A\n' } })
    fireEvent.change(byTestId('input-edgeText'), { target: { value: '节点A -> 节点B' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('未定义的节点')
  })

  it('非法权重进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '节点A\n节点B\n' } })
    fireEvent.change(byTestId('input-edgeText'), { target: { value: '节点A -> 节点B:abc' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('边权重非法')
  })

  it('自环边进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '节点A\n' } })
    fireEvent.change(byTestId('input-edgeText'), { target: { value: '节点A -> 节点A' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('自环')
  })

  it('点下载 PNG 触发 getDataURL', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      render(<Tool />)
      await vi.waitFor(() => expect(init).toHaveBeenCalled())
      fireEvent.click(byTestId('download-png'))
      expect(getDataURL).toHaveBeenCalled()
    } finally {
      clickSpy.mockRestore()
    }
  })

  it('卸载时 dispose 图表实例', async () => {
    const { unmount } = render(<Tool />)
    // 等待动态 import + init 完成
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    unmount()
    expect(dispose).toHaveBeenCalled()
  })
})
