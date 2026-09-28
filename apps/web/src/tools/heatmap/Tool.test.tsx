// @vitest-environment jsdom
/**
 * heatmap 组件测试：echarts 依赖真实 DOM 度量，jsdom 下用 vi.mock 替换，
 * 聚焦输入校验、错误态、PNG 导出与容器渲染。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_DATA } from './utils'

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
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('heatmap · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
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

  it('点示例填入示例数据并渲染图表容器', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_DATA)
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('非法输入（只有两列）进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '只有两列' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('每行须为 X类目')
  })

  it('重复数据点进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '周一, 上午, 1\n周一, 上午, 2' },
    })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('重复的数据点')
  })

  it('图表未渲染时下载 PNG 进入错误态', () => {
    render(<Tool />)
    // draw 是异步的：同步点击时 chart 实例尚未就绪
    fireEvent.click(byTestId('download-png'))
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('图表尚未渲染，无法导出 PNG')
  })

  it('点下载 PNG 触发 getDataURL 并点击下载链接', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<Tool />)
    // 等待动态 import + init 完成（全量运行时模块调度偶发变慢，放宽超时）
    await vi.waitFor(() => expect(init).toHaveBeenCalled(), { timeout: 10000 })
    fireEvent.click(byTestId('download-png'))
    expect(getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    })
    expect(clickSpy).toHaveBeenCalled()
    expect(byTestId('output').querySelector('[role="alert"]')).toBeNull()
  }, 20000)

  it('getDataURL 抛错时进入错误态', async () => {
    render(<Tool />)
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    getDataURL.mockImplementationOnce(() => {
      throw new Error('导出失败')
    })
    fireEvent.click(byTestId('download-png'))
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('导出失败')
  })

  it('卸载时 dispose 图表实例', async () => {
    const { unmount } = render(<Tool />)
    // 等待动态 import + init 完成
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    unmount()
    expect(dispose).toHaveBeenCalled()
  })
})
