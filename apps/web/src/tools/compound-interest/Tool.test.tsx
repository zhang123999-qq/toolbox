// @vitest-environment jsdom
/**
 * compound-interest 组件测试
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

describe('compound-interest · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-annualRate')).toBeTruthy()
    expect(byTestId('input-years')).toBeTruthy()
  })

  it('点示例后输出本息和与总利息', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output')
    expect(output.textContent).toContain('16,288.95')
    expect(output.textContent).toContain('6,288.95')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('非法输入进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '10000' } })
    fireEvent.change(byTestId('input-annualRate'), { target: { value: '5' } })
    fireEvent.change(byTestId('input-years'), { target: { value: '-3' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('年限须大于 0')
  })
})
