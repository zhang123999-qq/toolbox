// @vitest-environment jsdom
/**
 * interest 组件测试
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

describe('interest · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-annualRate')).toBeTruthy()
    expect(byTestId('input-termYears')).toBeTruthy()
  })

  it('点示例后输出复利利息与本息和', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output')
    expect(output.textContent).toContain('1,576.25')
    expect(output.textContent).toContain('11,576.25')
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
    fireEvent.change(byTestId('input-annualRate'), { target: { value: 'x' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('年利率无效')
  })
})
