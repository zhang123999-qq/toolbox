// @vitest-environment jsdom
/**
 * og 组件测试
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

describe('og · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 OG 标签', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('<meta property="og:title" content="如何做好 SEO：从零开始的完整指南">')
    expect(text).toContain('<meta property="og:type" content="website">')
  })

  it('标题为空时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '' } })
    expect(byTestId('output').textContent).toContain('og:title 不能为空')
  })

  it('填写图片后输出 og:image 行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('https://example.com/cover.png'), {
      target: { value: 'https://example.com/cover.png' },
    })
    expect(byTestId('output').textContent).toContain(
      '<meta property="og:image" content="https://example.com/cover.png">',
    )
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
