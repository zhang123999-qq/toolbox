// @vitest-environment jsdom
/**
 * decimal 组件测试
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

describe('decimal · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出精确结果 0.3 与浮点对照', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('精确结果：0.3')
    expect(output).toContain('JS 浮点结果：0.30000000000000004')
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

  it('输入表达式即时重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1/3' } })
    expect(byTestId('output').textContent).toContain('精确结果：0.33333333333333333333')
  })

  it('除数为 0 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1/0' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(screen.getByRole('alert').textContent).toMatch(/除数不能为 0/)
  })
})
