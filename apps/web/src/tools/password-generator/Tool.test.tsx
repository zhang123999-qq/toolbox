// @vitest-environment jsdom
/**
 * password-generator 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('password-generator · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后立即生成一条 16 位密码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toMatch(/^[!-~]{16}$/)
    expect(output).toMatch(/[a-z]/)
    expect(output).toMatch(/[A-Z]/)
    expect(output).toMatch(/[0-9]/)
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

  it('切到 32 位后输出变长', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('长度'), { target: { value: '32' } })
    expect(byTestId('output').textContent ?? '').toHaveLength(32)
  })

  it('勾选「排除易混字符」后输出里不含 Il1O0o', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByLabelText('排除易混字符'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toMatch(/^[a-zA-Z0-9!@#$%^&*()\-_=+[\]{}<>?/~]{16}$/)
    for (const char of 'Il1O0o') expect(output).not.toContain(char)
  })

  it('一类字符都不勾选时进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    for (const label of ['包含小写字母', '包含大写字母', '包含数字', '包含符号']) {
      fireEvent.click(screen.getByLabelText(label))
    }
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
