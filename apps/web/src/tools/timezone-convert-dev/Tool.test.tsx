// @vitest-environment jsdom
/**
 * timezone-convert-dev 组件测试
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

describe('timezone-convert-dev · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出北京→纽约换算', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('Asia/Shanghai：')
    expect(output).toContain('America/New_York：')
  })

  it('切换目标时区到伦敦后输出伦敦时间', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('目标时区'), {
      target: { value: 'Europe/London' },
    })
    expect(byTestId('output').textContent).toContain('Europe/London：')
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

  it('非法日期进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not-a-time' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
