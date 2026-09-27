// @vitest-environment jsdom
/**
 * ratio 组件测试
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

describe('ratio · Tool', () => {
  it('渲染后 7 个必需 data-testid + 第二个值输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出化简结果', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('2 : 3')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('切换到分配模式后输出份额', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2:3:5' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '1000' } })
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'split' } })
    expect(byTestId('output').textContent).toContain('第 1 项：200')
  })

  it('非法输入进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a:b' } })
    expect(screen.getByRole('alert').textContent).toMatch(/不是有效数字/)
  })
})
