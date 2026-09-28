// @vitest-environment jsdom
/**
 * edge-cache 组件测试（#816）：生成与解析模式切换。
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

function byLabel(label: string): HTMLElement {
  const el = screen.queryByLabelText(label)
  if (!el) throw new Error('缺少 label="' + label + '" 的控件')
  return el as HTMLElement
}

describe('edge-cache · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getAllByRole('combobox').length).toBeGreaterThan(0)
  })

  it('默认 build 模式拼装出头部', () => {
    render(<Tool />)
    expect(byTestId('edge-cache-header').textContent).toBe(
      'max-age=3600, s-maxage=86400, stale-while-revalidate=60',
    )
    expect(byTestId('edge-cache-detail').textContent).toContain('浏览器缓存 3600 秒')
  })

  it('切换到 parse 模式解析左侧文本', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    expect(byTestId('edge-cache-detail').textContent).toContain('CDN 缓存 86400 秒')
  })

  it('非法数字显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byLabel('max-age（秒）'), { target: { value: '-3' } })
    expect(byTestId('edge-cache-error').textContent).toContain('max-age 须为非负整数')
  })

  it('parse 模式非法指令值显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'parse' } })
    fireEvent.change(byTestId('input'), { target: { value: 'max-age=abc' } })
    expect(byTestId('edge-cache-error').textContent).toContain('指令值非法')
  })
})
