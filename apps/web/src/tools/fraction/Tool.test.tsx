// @vitest-environment jsdom
/**
 * fraction 组件测试
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

describe('fraction · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出精确分数 5/6', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('分数：5/6')
    expect(output).toContain('小数（10 位）：0.8333333333')
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

  it('切换小数位数后输出跟随', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1/3' } })
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '4' } })
    expect(byTestId('output').textContent).toContain('小数（4 位）：0.3333')
  })

  it('非法表达式进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1/2 +' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
