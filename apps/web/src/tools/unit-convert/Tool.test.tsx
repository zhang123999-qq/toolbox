// @vitest-environment jsdom
/**
 * unit-convert 组件测试
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

describe('unit-convert · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出换算结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('100 km/h = 27.7777777778 m/s')
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

  it('切换到温度单位后输出温度换算', () => {
    const { container } = render(<Tool />)
    const [from, to] = Array.from(container.querySelectorAll('select'))
    fireEvent.change(from, { target: { value: 'C' } })
    fireEvent.change(to, { target: { value: 'F' } })
    fireEvent.change(byTestId('input'), { target: { value: '100' } })
    expect(byTestId('output').textContent).toContain('100 C = 212 F')
  })

  it('输入非法数字进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('请输入有效的数字')
  })
})
