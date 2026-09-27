// @vitest-environment jsdom
/**
 * split-bill 组件测试
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

describe('split-bill · Tool', () => {
  it('渲染后 7 个必需 data-testid + 人数输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出 300 元 3 人 AA', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe(
      '消费总额：300.00 元\n小费（0%）：0.00 元\n应付总计：300.00 元\n人均（3 人）：100.00 元',
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

  it('人数为空进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '300' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('人数不能为空')
  })

  it('切换小费比例改变结果', () => {
    render(<Tool />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '10' } })
    fireEvent.change(byTestId('input'), { target: { value: '300' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '3' } })
    expect(byTestId('output').textContent).toBe(
      '消费总额：300.00 元\n小费（10%）：30.00 元\n应付总计：330.00 元\n人均（3 人）：110.00 元',
    )
  })
})
