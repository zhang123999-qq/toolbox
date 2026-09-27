// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('workday · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例：2025-01-27 加 3 个工作日 = 2025-01-30', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('结果日期：2025-01-30')
  })

  it('切到减法得到上周五', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'subtract' } })
    expect(byTestId('output').textContent).toContain('结果日期：2025-01-22')
  })

  it('「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('手动输入含排除日的多行文本', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2025-01-27\n1\n2025-01-28' } })
    expect(byTestId('output').textContent).toContain('结果日期：2025-01-29')
  })

  it('非法日期进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2025-13-01\n1' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
