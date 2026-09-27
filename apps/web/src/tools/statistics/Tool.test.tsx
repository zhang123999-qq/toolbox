// @vitest-environment jsdom
/**
 * statistics 组件测试
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

describe('statistics · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出区挂上图表容器与汇总', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(screen.queryByTestId('chart')).not.toBeNull()
    expect(byTestId('output').textContent).toContain('数据个数')
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

  it('非数字行进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '10\nabc' } })
    // T3 的 data-testid="output" 是外层容器，role="alert" 在内部错误段落上
    expect(screen.queryByRole('alert')).not.toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('第 2 行')
  })

  it('切换到饼图后仍给出图表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'pie' } })
    expect(screen.queryByTestId('chart')).not.toBeNull()
  })

  it('切换到折线图后仍给出图表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'line' } })
    expect(screen.queryByTestId('chart')).not.toBeNull()
  })
})
