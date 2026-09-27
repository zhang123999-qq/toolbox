// @vitest-environment jsdom
/**
 * currency 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('currency · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出格式化金额', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('¥1,234,567.89')
  })

  it('切换货币与地区后输出跟随变化', () => {
    const { container } = render(<Tool />)
    const [currency, locale] = Array.from(container.querySelectorAll('select'))
    fireEvent.change(currency as HTMLSelectElement, { target: { value: 'USD' } })
    fireEvent.change(locale as HTMLSelectElement, { target: { value: 'en-US' } })
    fireEvent.change(byTestId('input'), { target: { value: '1234.5' } })
    expect(byTestId('output').textContent).toBe('$1,234.50')
  })

  it('切换显示方式为 code 后输出货币代码', () => {
    const { container } = render(<Tool />)
    const selects = Array.from(container.querySelectorAll('select'))
    fireEvent.change(selects[0] as HTMLSelectElement, { target: { value: 'USD' } })
    fireEvent.change(selects[1] as HTMLSelectElement, { target: { value: 'en-US' } })
    fireEvent.change(selects[2] as HTMLSelectElement, { target: { value: 'code' } })
    fireEvent.change(byTestId('input'), { target: { value: '10' } })
    expect(byTestId('output').textContent).toContain('USD')
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

  it('非法输入进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('金额无效')
  })
})
