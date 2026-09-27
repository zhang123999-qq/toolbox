// @vitest-environment jsdom
/**
 * due-date 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('due-date · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出预产期与末次月经', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('末次月经：2026-01-01')
    expect(text).toContain('预产期：2026-10-08')
    expect(text).toContain('当前孕周：')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('非法日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('无法解析的日期格式')
  })

  it('未来日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2999-01-01' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('末次月经日期不能晚于今天')
  })

  it('手工输入合法日期算出预产期', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2026-01-01' } })
    expect(byTestId('output').textContent).toContain('预产期：2026-10-08')
  })
})
