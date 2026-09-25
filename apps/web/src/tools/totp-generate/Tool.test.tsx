// @vitest-environment jsdom
/**
 * totp-generate 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('totp-generate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后立刻给出 6 位验证码（同步工具无需点运行）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toMatch(/^\d{6}\n/)
    expect(output()).toContain('周期 30 秒')
  })

  it('切到 8 位后输出 8 位码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('位数'), { target: { value: '8' } })
    expect(output()).toMatch(/^\d{8}\n/)
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

  it('密钥不是 Base32 时进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0189-invalid' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
