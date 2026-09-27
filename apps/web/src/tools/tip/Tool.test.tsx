// @vitest-environment jsdom
/**
 * tip 组件测试
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

describe('tip · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出账单 200、小费 15%', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      '账单金额：200.00 元\n小费（15%）：30.00 元\n总计：230.00 元\n人均（1 人）：230.00 元',
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

  it('非法账单进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('账单金额请输入有效的数字')
  })

  it('切换小费比例和人数改变结果', () => {
    render(<Tool />)
    const rateSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(rateSelect, { target: { value: '20' } })
    const peopleBox = screen.getByPlaceholderText('1')
    fireEvent.change(peopleBox, { target: { value: '2' } })
    fireEvent.change(byTestId('input'), { target: { value: '100' } })
    expect(byTestId('output').textContent).toBe(
      '账单金额：100.00 元\n小费（20%）：20.00 元\n总计：120.00 元\n人均（2 人）：60.00 元',
    )
  })
})
