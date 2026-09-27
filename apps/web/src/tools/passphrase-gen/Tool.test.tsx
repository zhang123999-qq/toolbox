// @vitest-environment jsdom
/**
 * passphrase-gen 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('passphrase-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-separator')).toBeTruthy()
  })

  it('页面有与「随机密码」区分的说明文案', () => {
    render(<Tool />)
    expect(screen.getByText(/多个英文单词组成的易记短语/)).toBeTruthy()
    expect(screen.getByText(/随机密码/)).toBeTruthy()
  })

  it('点示例后输出 4 词短语', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = (byTestId('output').textContent ?? '').trim()
    expect(text).toMatch(/^([a-z]+-){3}[a-z]+$/)
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('分隔符超长进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-separator'), { target: { value: 'x'.repeat(9) } })
    fireEvent.change(byTestId('input'), { target: { value: 'generate' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('分隔符过长')
  })
})
