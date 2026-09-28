// @vitest-environment jsdom
/**
 * sitemap-generate 组件测试
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

describe('sitemap-generate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 urlset', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('<urlset')
    expect(text).toContain('<loc>https://example.com/</loc>')
    expect(text.match(/<url>/g)).toHaveLength(3)
  })

  it('非法 URL 时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'https://example.com/\nnot a url' } })
    expect(byTestId('output').textContent).toContain('第 2 行 URL 不合法')
  })

  it('空输入时提示输入 URL', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '   ' } })
    expect(byTestId('output').textContent).toContain('请至少输入一个 URL')
  })

  it('填写 priority 后输出 priority 元素', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('0.8'), { target: { value: '0.8' } })
    expect(byTestId('output').textContent).toContain('<priority>0.8</priority>')
  })

  it('priority 非法时中文错误提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('0.8'), { target: { value: '9' } })
    expect(byTestId('output').textContent).toContain('Priority 必须是 0.0～1.0 之间的数字')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
