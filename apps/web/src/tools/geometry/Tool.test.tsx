// @vitest-environment jsdom
/**
 * geometry 组件测试
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

describe('geometry · Tool', () => {
  it('渲染后 7 个必需 data-testid + 图形选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByRole('combobox')).toBeTruthy() // 图形选项（select 无 data-testid，走 role）
  })

  it('点示例后输出圆的周长与面积', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('周长：31.41592654')
    expect(output).toContain('面积：78.53981634')
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

  it('切换图形到矩形即时重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '3\n4' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rectangle' } })
    expect(byTestId('output').textContent).toContain('面积：12')
  })

  it('参数为负数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'r=-5' } })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('正数')
  })
})
