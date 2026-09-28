// @vitest-environment jsdom
/**
 * chart-theme 组件测试：echarts 用 vi.mock 替换，聚焦主题校验、错误态与 JSON 输出。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_TITLE } from './utils'

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

describe('chart-theme · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'chart-container', 'theme-json']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例填入标题并渲染默认主题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_TITLE)
    const json = byTestId('theme-json').textContent ?? ''
    expect(json).toContain('#5470c6')
    expect(json).toContain('#ffffff')
  })

  it('echarts.init 收到主题对象', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    await vi.waitFor(() => {
      expect(init).toHaveBeenCalled()
    })
    const calls = init.mock.calls as unknown[][]
    const theme = calls[0]?.[1] as { color: string[] } | undefined
    expect(theme?.color).toContain('#5470c6')
  })

  it('非法背景色进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const bg = byTestId('option-background') as HTMLInputElement
    fireEvent.change(bg, { target: { value: 'red' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('背景色须为 #RGB 或 #RRGGBB 格式')
  })

  it('非法色板进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const palette = byTestId('option-palette') as HTMLInputElement
    // 空色板回退默认值，不报错
    fireEvent.change(palette, { target: { value: '' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).not.toContain('主色板不能为空')
    // 非法值报错并带序号
    fireEvent.change(palette, { target: { value: 'not-a-color' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('主色板第 1 个颜色')
  })
})
