// @vitest-environment jsdom
/**
 * discount 组件测试
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

describe('discount · Tool', () => {
  it('渲染后 7 个必需 data-testid + 折扣输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出 100 元 8.5 折', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      '原价：100.00 元\n折扣：8.5 折\n折后价：85.00 元\n节省：15.00 元',
    )
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

  it('非法原价进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('原价请输入有效的数字')
  })

  it('切换计算方式到按折后价改变结果', () => {
    render(<Tool />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '按折后价' } })
    fireEvent.change(byTestId('input'), { target: { value: '100' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '85' } })
    expect(byTestId('output').textContent).toContain('折后价：85.00 元')
    expect(byTestId('output').textContent).toContain('节省：15.00 元')
  })
})
