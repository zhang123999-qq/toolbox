// @vitest-environment jsdom
/**
 * csp 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('csp · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出完整的 CSP 头', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output.startsWith("Content-Security-Policy: default-src 'self'; ")).toBe(true)
    expect(output).toContain('# 可读版本（每条指令一行）')
    expect(output).toContain("frame-ancestors 'none'")
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

  it('取消「严格模式」后换成宽松指令', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByLabelText('严格模式'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain("object-src 'self'")
    expect(output).not.toContain('upgrade-insecure-requests')
  })

  it('勾选「包含小写字母」后允许内联脚本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByLabelText('包含小写字母'))
    expect(byTestId('output').textContent).toContain("script-src 'self' 'unsafe-inline'")
  })

  it('切到 report-only 后换成观察用头名', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'report-only' } })
    const output = byTestId('output').textContent ?? ''
    expect(output.startsWith('Content-Security-Policy-Report-Only: ')).toBe(true)
    expect(output).not.toContain('Content-Security-Policy: ')
  })

  it('模式选项值非法时进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'bogus' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
