// @vitest-environment jsdom
/**
 * port-scan 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('port-scan · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 nmap 命令与浏览器边界说明', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('nmap -sT -p 1-1000 -sV example.com')
    expect(output).toContain('浏览器无法发起真实')
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

  it('切换扫描类型为 udp 后命令换成 -sU', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('扫描类型'), { target: { value: 'udp' } })
    expect(byTestId('output').textContent).toContain('nmap -sU -p 1-1000 -sV example.com')
  })

  it('修改端口范围后命令同步更新', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('端口范围'), { target: { value: '22,80,443' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('nmap -sT -p 22,80,443 -sV example.com')
    expect(output).toContain('for p in 22 80 443; do nc')
  })

  it('非法目标时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'bad host' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
