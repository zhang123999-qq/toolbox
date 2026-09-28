// @vitest-environment jsdom
/**
 * gauge 组件测试：echarts 依赖真实 DOM 度量，jsdom 下用 vi.mock 替换，
 * 聚焦输入校验、错误态、PNG 导出与容器渲染。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

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

describe('gauge · Tool', () => {
  it('渲染后必需 data-testid 存在（含三个数值输入）', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-value',
      'input-min',
      'input-max',
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

  it('点示例填入三处数值', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input-value') as HTMLTextAreaElement).value).toBe('75')
    expect((byTestId('input-min') as HTMLTextAreaElement).value).toBe('0')
    expect((byTestId('input-max') as HTMLTextAreaElement).value).toBe('100')
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('当前值越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-value'), { target: { value: '120' } })
    fireEvent.change(byTestId('input-min'), { target: { value: '0' } })
    fireEvent.change(byTestId('input-max'), { target: { value: '100' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('当前值须在 0–100 之间')
  })

  it('最小值 ≥ 最大值进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-value'), { target: { value: '50' } })
    fireEvent.change(byTestId('input-min'), { target: { value: '100' } })
    fireEvent.change(byTestId('input-max'), { target: { value: '100' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('最小值须小于最大值')
  })

  it('点下载 PNG 触发 getDataURL', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
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
