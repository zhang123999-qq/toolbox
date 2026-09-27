// @vitest-environment jsdom
/**
 * due-date 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('due-date · Tool', () => {
  it('渲染后 7 个必需 data-testid + 周期/参考日期输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-cycleLength')).toBeTruthy()
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出预产期与孕周', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output')
    expect(output.textContent).toContain('预产期')
    expect(output.textContent).toContain('2027-03-08')
    expect(output.textContent).toContain('孕 16 周 6 天')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-cycleLength') as HTMLTextAreaElement).value).toBe('28')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('非法日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not-a-date' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('无法解析的日期')
  })

  it('非法周期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2026-06-01' } })
    fireEvent.change(byTestId('input-cycleLength'), { target: { value: 'abc' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('周期长度无效')
  })

  it('短周期示例输出调整说明', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2026-06-01' } })
    fireEvent.change(byTestId('input-cycleLength'), { target: { value: '20' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '2026-09-27' } })
    expect(byTestId('output').textContent).toContain('2027-02-28')
    expect(byTestId('output').textContent).toContain('已按 20 天周期调整 -8 天')
  })
})
