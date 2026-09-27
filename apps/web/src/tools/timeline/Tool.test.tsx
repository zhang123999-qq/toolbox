// @vitest-environment jsdom
/**
 * timeline 组件测试
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

describe('timeline · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出排序后的时间线', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('2024-01-15')
    expect(output).toContain('项目启动')
    expect(output).toContain('+46 天')
  })

  it('追加一行事件后时间线变长', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '2024-01-15 | 启动\n2024-06-01 | 发布' },
    })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('2024-06-01')
    expect(output).toContain('+138 天')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('无有效事件时输出为空且不报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '没有日期的行' } })
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
