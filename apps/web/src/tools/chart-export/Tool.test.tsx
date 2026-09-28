// @vitest-environment jsdom
/**
 * chart-export 组件测试：echarts 依赖真实 DOM 度量，jsdom 下用 vi.mock 替换，
 * 聚焦 JSON 校验、错误态、PNG/SVG 导出与预览容器渲染。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_OPTION } from './utils'

const dispose = vi.fn()
const setOption = vi.fn()
const getDataURL = vi.fn(() => 'data:image/png;base64,AAAA')
const init = vi.fn((_el?: unknown) => ({ dispose, setOption, getDataURL }))

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

describe('chart-export · Tool', () => {
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
      'export-image',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例填入示例 option 并渲染预览容器', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_OPTION)
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('非法 JSON 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{oops' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('JSON 解析失败')
  })

  it('数组 JSON 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[1,2]' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('须为 JSON 对象')
  })

  it('PNG 导出触发 getDataURL 并带背景色', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(byTestId('export-image'))
    await vi.waitFor(() => expect(getDataURL).toHaveBeenCalled())
    expect(getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#ffffff',
    })
    expect(clickSpy).toHaveBeenCalled()
    const a = clickSpy.mock.instances[0] as HTMLAnchorElement
    expect(a.download).toBe('chart-export.png')
  })

  it('SVG 导出生成 svg 文件下载', async () => {
    init.mockImplementation((el) => {
      ;(el as HTMLElement).innerHTML = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
      return { dispose, setOption, getDataURL }
    })
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const formatSelect = screen.getByText('导出格式').querySelector('select')
    fireEvent.change(formatSelect!, { target: { value: 'svg' } })
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    })
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(byTestId('export-image'))
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalled())
    expect(clickSpy).toHaveBeenCalled()
    const a = clickSpy.mock.instances[0] as HTMLAnchorElement
    expect(a.download).toBe('chart-export.svg')
    init.mockImplementation(() => ({ dispose, setOption, getDataURL }))
  })

  it('SVG 渲染失败报中文错', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const formatSelect = screen.getByText('导出格式').querySelector('select')
    fireEvent.change(formatSelect!, { target: { value: 'svg' } })
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    // 默认 mock 不向临时容器注入 svg → 走「未生成 svg 元素」分支
    fireEvent.click(byTestId('export-image'))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('SVG 渲染失败')
  })

  it('图表尚未渲染时点导出报中文错', async () => {
    init.mockImplementation(() => {
      throw new Error('init 失败')
    })
    render(<Tool />)
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    fireEvent.click(byTestId('export-image'))
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
