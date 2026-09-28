// @vitest-environment jsdom
/**
 * canonical 组件测试（#626）
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

describe('canonical · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」并填写规范 URL 后输出 canonical 标签', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('https://example.com/blog/post'), {
      target: { value: 'https://example.com/blog/post' },
    })
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('<link rel="canonical" href="https://example.com/blog/post">')
  })

  it('页面 URL 为空时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '' } })
    expect(byTestId('output').textContent).toContain('页面 URL 不能为空')
  })

  it('填写规范 URL 后输出对应 href', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com/a' } })
    fireEvent.change(screen.getByPlaceholderText('https://example.com/blog/post'), {
      target: { value: 'https://example.com/c' },
    })
    expect(byTestId('output').textContent).toContain('href="https://example.com/c"')
  })

  it('规范 URL 不合法时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com/a' } })
    fireEvent.change(screen.getByPlaceholderText('https://example.com/blog/post'), {
      target: { value: 'not-a-url' },
    })
    expect(byTestId('output').textContent).toContain('规范 URL 不合法')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
