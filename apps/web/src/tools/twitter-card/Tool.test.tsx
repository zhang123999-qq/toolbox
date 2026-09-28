// @vitest-environment jsdom
/**
 * twitter-card 组件测试
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

describe('twitter-card · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 Twitter Card 标签', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('<meta name="twitter:card" content="summary_large_image">')
    expect(text).toContain('<meta name="twitter:title" content="10 个提升网站速度的实用技巧">')
  })

  it('标题为空时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '  ' } })
    expect(byTestId('output').textContent).toContain('twitter:title 不能为空')
  })

  it('填写账号后输出 twitter:site 行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('@example'), { target: { value: '@example' } })
    expect(byTestId('output').textContent).toContain('<meta name="twitter:site" content="@example">')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
