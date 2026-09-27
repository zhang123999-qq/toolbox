// @vitest-environment jsdom
/**
 * precision 组件测试
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

describe('precision · Tool', () => {
  it('渲染后 7 个必需 data-testid + 第二个数输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出 0.1+0.2 的误差对照', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('精确结果（decimal.js）：0.3')
    expect(output).toContain('JS 原生浮点结果：0.30000000000000004')
    expect(output).toContain('存在浮点误差')
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

  it('非法数字进入错误态（中英双语）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '1' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('数字无效')
    expect(output.textContent).toContain('Invalid number')
  })

  it('切换运算符后重算（减法）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const select = screen.getByLabelText('运算符') as HTMLSelectElement
    fireEvent.change(select, { target: { value: '-' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('表达式：0.1 - 0.2')
    expect(output).toContain('精确结果（decimal.js）：-0.1')
  })
})
