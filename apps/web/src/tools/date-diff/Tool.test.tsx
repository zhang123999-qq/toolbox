// @vitest-environment jsdom
/**
 * date-diff 组件测试
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

describe('date-diff · Tool', () => {
  it('渲染后 7 个必需 data-testid + 日期 B 输入框全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出 2024-01-01 → 2025-03-15 的间隔', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('日期 A：2024-01-01')
    expect(output).toContain('日期 B：2025-03-15')
    expect(output).toContain('复合间隔：1 年 2 个月 14 天')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-textB') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('修改日期 B 后总量随之变化', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-textB'), { target: { value: '2024-01-08' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('总天数：7 天')
  })

  it('输入越界日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2024-02-30' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '2024-03-01' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
