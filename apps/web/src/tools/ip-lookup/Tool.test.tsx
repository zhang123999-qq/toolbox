// @vitest-environment jsdom
/**
 * ip-lookup 组件测试
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

describe('ip-lookup · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 192.168.1.1 的分类', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('私网地址')
    expect(output).toContain('二进制：')
  })

  it('输入 ::1 识别为 IPv6 环回', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '::1' } })
    expect(byTestId('output').textContent).toContain('环回地址')
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

  it('非法 IP 进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '999.1.1.1' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
