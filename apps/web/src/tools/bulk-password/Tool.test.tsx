// @vitest-environment jsdom
/**
 * bulk-password 组件测试
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

describe('bulk-password · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-count')).toBeTruthy()
  })

  it('页面有与「随机密码」区分的说明 + 上限文案', () => {
    render(<Tool />)
    expect(screen.getByText(/一次生成多条随机密码/)).toBeTruthy()
    expect(screen.getByText(/上限 10000 条/)).toBeTruthy()
  })

  it('点示例后输出 10 条 16 位密码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const lines = (byTestId('output').textContent ?? '').trim().split('\n')
    expect(lines).toHaveLength(10)
    for (const line of lines) expect(line).toHaveLength(16)
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

  it('数量填 0 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-count'), { target: { value: '0' } })
    fireEvent.change(byTestId('input'), { target: { value: 'generate' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('数量无效')
  })

  it('改数量为 3，输出 3 条', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-count'), { target: { value: '3' } })
    fireEvent.change(byTestId('input'), { target: { value: 'generate' } })
    const lines = (byTestId('output').textContent ?? '').trim().split('\n')
    expect(lines).toHaveLength(3)
  })
})
