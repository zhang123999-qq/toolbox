// @vitest-environment jsdom
/**
 * cron-generator 组件测试
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

describe('cron-generator · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出每分钟的 cron', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output.startsWith('* * * * *')).toBe(true)
    expect(output).toContain('每分钟')
  })

  it('把「分」改成 0、「时」改成 2 后输出 0 2 * * *', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-minute'), { target: { value: '0' } })
    fireEvent.change(byTestId('option-hour'), { target: { value: '2' } })
    expect(byTestId('output').textContent).toContain('0 2 * * *')
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

  it('非法字段进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-minute'), { target: { value: '99' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
