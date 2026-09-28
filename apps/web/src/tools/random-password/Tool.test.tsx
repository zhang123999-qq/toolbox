// @vitest-environment jsdom
/**
 * random-password 组件测试
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

describe('random-password · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-length')).toBeTruthy()
  })

  it('点示例后输出 16 位密码，含大小写与数字', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toMatch(/^[!-~]{16}$/)
    expect(out).toMatch(/[a-z]/)
    expect(out).toMatch(/[A-Z]/)
    expect(out).toMatch(/[0-9]/)
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

  it('长度改为 32 后输出变长', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-length'), { target: { value: '32' } })
    expect(byTestId('output').textContent ?? '').toHaveLength(32)
  })

  it('勾选排除易混淆字符后不含 Il1O0o', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByLabelText('排除易混淆字符'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toHaveLength(16)
    for (const ch of 'Il1O0o') expect(out).not.toContain(ch)
  })

  it('长度填 999 进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-length'), { target: { value: '999' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('密码长度必须在')
  })
})
