// @vitest-environment jsdom
/**
 * otp-qr 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('otp-qr · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('签发者 / 账户名 / 计数器各有附加输入框', () => {
    render(<Tool />)
    expect(byTestId('input-issuer')).toBeTruthy()
    expect(byTestId('input-account')).toBeTruthy()
    expect(byTestId('input-counter')).toBeTruthy()
  })

  it('示例 → 立即输出 URI 与二维码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('otpauth://totp/Toolbox:demo%40example.com')
    expect(output()).toContain('██')
  })

  it('切到 HOTP 后 URI 带 counter', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('类型'), { target: { value: 'hotp' } })
    expect(output()).toContain('otpauth://hotp/')
    expect(output()).toContain('counter=0')
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

  it('未填账户名与签发者时进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'JBSWY3DPEHPK3PXP' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
