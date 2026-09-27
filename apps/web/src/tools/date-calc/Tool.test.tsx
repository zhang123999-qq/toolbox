// @vitest-environment jsdom
/**
 * date-calc 组件测试
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

describe('date-calc · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 2024-02-29 加 1 年 = 2025-02-28', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('基准日期：2024-02-29')
    expect(output).toContain('结果：2025-02-28')
    expect(output).toContain('回退到 2 月 28 日')
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

  it('切到「减」并改数量后结果随之变化', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('操作'), { target: { value: 'subtract' } })
    fireEvent.change(screen.getByLabelText('数量'), { target: { value: '2' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('操作：减 2 年')
    expect(output).toContain('结果：2022-02-28')
  })

  it('改单位为 month 后 1-31 +1 月回退到月末', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2024-01-31' } })
    fireEvent.change(screen.getByLabelText('单位'), { target: { value: 'month' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('结果：2024-02-29')
  })

  it('输入越界日期进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2024-02-30' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
