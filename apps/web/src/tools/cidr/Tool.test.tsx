// @vitest-environment jsdom
/**
 * cidr 组件测试
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

describe('cidr · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 /24 的网络信息', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('子网掩码：255.255.255.0')
    expect(output).toContain('广播地址：192.168.1.255')
  })

  it('输入 /8 得到 1677 万地址', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '10.0.0.0/8' } })
    expect(byTestId('output').textContent).toContain('16777216')
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

  it('非法 CIDR 进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not-a-cidr' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
