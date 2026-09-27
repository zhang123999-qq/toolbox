// @vitest-environment jsdom
/**
 * countdown 组件测试
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

describe('countdown · Tool', () => {
  it('渲染后 7 个必需 data-testid + 开始日期输入框 + 标题选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
    expect(byTestId('option-title')).toBeTruthy()
  })

  it('点示例后输出目标与剩余', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('目标：2027-01-01')
    expect(output).toContain('状态：未开始')
    expect(output).toContain('剩余：')
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

  it('改成过去日期后显示已过期', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2000-01-01 00:00:00' } })
    expect(byTestId('output').textContent).toContain('状态：已过期')
  })

  it('填开始日期后输出进度百分比', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-textB'), { target: { value: '2020-01-01 00:00:00' } })
    expect(byTestId('output').textContent).toContain('进度：')
  })

  it('输入越界日期进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2024-02-30' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
