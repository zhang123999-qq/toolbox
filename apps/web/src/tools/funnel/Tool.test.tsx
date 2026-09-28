// @vitest-environment jsdom
/**
 * funnel 组件测试：echarts 依赖真实 DOM 度量，jsdom 下用 vi.mock 替换，
 * 聚焦输入校验、错误态、PNG 导出与容器渲染。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_DATA } from './utils'

const dispose = vi.fn()
const setOption = vi.fn()
const getDataURL = vi.fn(() => 'data:image/png;base64,AAAA')
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

describe('funnel · Tool', () => {
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
      'chart-container',
      'download-png',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例填入示例数据并渲染图表容器', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_DATA)
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('非法数据行进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '访问100\n注册:50' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('数据行格式非法')
  })

  it('阶段不足 2 个进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '访问:100' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('至少需要 2 个阶段')
  })

  it('点下载 PNG 触发 getDataURL', async () => {
    render(<Tool />)
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(byTestId('download-png'))
    expect(getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff',
    })
    expect(clickSpy).toHaveBeenCalled()
  })

  it('图表尚未渲染时点下载 PNG 报中文错', async () => {
    init.mockImplementation(() => {
      throw new Error('init 失败')
    })
    render(<Tool />)
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    fireEvent.click(byTestId('download-png'))
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('图表尚未渲染，无法导出 PNG')
    init.mockImplementation(() => ({ dispose, setOption, getDataURL }))
  })

  it('卸载时 dispose 图表实例', async () => {
    const { unmount } = render(<Tool />)
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    unmount()
    expect(dispose).toHaveBeenCalled()
  })
})
