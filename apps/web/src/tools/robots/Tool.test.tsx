// @vitest-environment jsdom
/**
 * robots 组件测试
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

describe('robots · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出标准 robots.txt', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('User-agent: *')
    expect(text).toContain('Disallow: /private')
    expect(text).toContain('Allow: /private/public')
    expect(text).toContain('User-agent: Googlebot')
  })

  it('规则格式错误时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '* deny /private' } })
    expect(byTestId('output').textContent).toContain('指令必须是 allow 或 disallow')
  })

  it('空输入时提示添加规则', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '   ' } })
    expect(byTestId('output').textContent).toContain('请至少添加一条规则')
  })

  it('填写 Sitemap 后输出包含 Sitemap 行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('https://example.com/sitemap.xml'), {
      target: { value: 'https://example.com/sitemap.xml' },
    })
    expect(byTestId('output').textContent).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('Sitemap 非法时中文错误提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('https://example.com/sitemap.xml'), {
      target: { value: 'not a url' },
    })
    expect(byTestId('output').textContent).toContain('Sitemap URL 不合法')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
