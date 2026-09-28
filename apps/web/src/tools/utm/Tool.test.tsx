// @vitest-environment jsdom
/**
 * utm 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('utm · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出区进入错误态（参数未填）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('utm_source 不能为空')
  })

  it('填入三参数后输出带参 URL', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com/landing' } })
    fireEvent.change(screen.getByPlaceholderText('google'), { target: { value: 'google' } })
    fireEvent.change(screen.getByPlaceholderText('cpc'), { target: { value: 'cpc' } })
    fireEvent.change(screen.getByPlaceholderText('spring_sale'), { target: { value: 'sale' } })
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('utm_source=google')
    expect(text).toContain('utm_medium=cpc')
    expect(text).toContain('utm_campaign=sale')
  })

  it('基 URL 非法时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not a url' } })
    fireEvent.change(screen.getByPlaceholderText('google'), { target: { value: 's' } })
    fireEvent.change(screen.getByPlaceholderText('cpc'), { target: { value: 'm' } })
    fireEvent.change(screen.getByPlaceholderText('spring_sale'), { target: { value: 'c' } })
    expect(byTestId('output').textContent).toContain('基 URL 不合法')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
