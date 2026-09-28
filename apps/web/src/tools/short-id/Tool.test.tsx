// @vitest-environment jsdom
/**
 * short-id 组件测试
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

describe('short-id · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-length')).toBeTruthy()
  })

  it('点示例输出 8 位字母数字短 ID', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent ?? '').toMatch(/^[A-Za-z0-9]{8}$/)
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

  it('切换为 hex 后只含十六进制字符', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('字符集'), { target: { value: 'hex' } })
    expect(byTestId('output').textContent ?? '').toMatch(/^[0-9a-f]{8}$/)
  })

  it('勾选排除易混淆字符后不含 Il1O0o', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByLabelText('排除易混淆字符'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toHaveLength(8)
    for (const ch of 'Il1O0o') expect(out).not.toContain(ch)
  })

  it('长度填 0 进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-length'), { target: { value: '0' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('短 ID 长度必须在')
  })
})
