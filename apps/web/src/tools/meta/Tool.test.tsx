// @vitest-environment jsdom
/**
 * meta 组件测试
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

describe('meta · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 title 与 meta 行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('<title>我的博客 - 分享技术与生活</title>')
    expect(text).toContain('<meta charset="UTF-8">')
    expect(text).toContain('<meta name="viewport"')
  })

  it('标题为空时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '   ' } })
    expect(byTestId('output').textContent).toContain('页面标题（title）不能为空')
  })

  it('填写描述后输出 description 行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('一句话介绍页面内容'), {
      target: { value: '技术博客' },
    })
    expect(byTestId('output').textContent).toContain('<meta name="description" content="技术博客">')
  })

  it('特殊字符被转义', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'A&B' } })
    expect(byTestId('output').textContent).toContain('<title>A&amp;B</title>')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
