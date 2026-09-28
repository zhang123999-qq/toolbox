// @vitest-environment jsdom
/**
 * radar 组件测试：echarts 依赖真实 DOM 度量，jsdom 下用 vi.mock 替换，
 * 聚焦输入校验、错误态、PNG 导出与容器渲染。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_DATA, EXAMPLE_MAX } from './utils'

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

describe('radar · Tool', () => {
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
    // 指标最大值输入框（extraInput）存在
    expect(byTestId('input-maxText')).toBeTruthy()
  })

  it('点示例填入两处输入并渲染图表容器', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_DATA)
    expect((byTestId('input-maxText') as HTMLTextAreaElement).value).toBe(EXAMPLE_MAX)
    expect(byTestId('chart-container')).toBeTruthy()
  })

  it('非法 maxText 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-maxText'), { target: { value: '速度100' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('指标最大值')
  })

  it('未知指标进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value: '产品A, 速度:80, 力量:65, 耐力:90\n产品B, 体能:70, 速度:60, 力量:85, 耐力:70',
      },
    })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('未知指标')
  })

  it('点下载 PNG 触发 getDataURL', async () => {
    render(<Tool />)
    // 等待动态 import + init 完成，图表实例就绪
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
    // init 抛错 → 图表实例始终建不起来，downloadPng 走"尚未渲染"分支
    init.mockImplementation(() => {
      throw new Error('init 失败')
    })
    render(<Tool />)
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    fireEvent.click(byTestId('download-png'))
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('图表尚未渲染，无法导出 PNG')
    // 恢复默认实现，避免影响后续用例
    init.mockImplementation(() => ({ dispose, setOption, getDataURL }))
  })

  it('卸载时 dispose 图表实例', async () => {
    const { unmount } = render(<Tool />)
    // 等待动态 import + init 完成
    await vi.waitFor(() => expect(init).toHaveBeenCalled())
    unmount()
    expect(dispose).toHaveBeenCalled()
  })
})
