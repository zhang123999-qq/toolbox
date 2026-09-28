// @vitest-environment jsdom
/**
 * breadcrumb 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('breadcrumb · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入显示提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('面包屑层级')
  })

  it('示例填入后显示预览与两段代码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('首页')
    expect(text).toContain('智能手机')
    expect(text).toContain('<nav')
    expect(text).toContain('BreadcrumbList')
  })

  it('URL 为空的末项给出提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '首页 || https://example.com/' } })
    expect(byTestId('output').textContent).not.toContain('URL 为空')
    fireEvent.change(byTestId('input'), { target: { value: '首页\n产品 || https://example.com/p' } })
    expect(byTestId('output').textContent).toContain('URL 为空')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
