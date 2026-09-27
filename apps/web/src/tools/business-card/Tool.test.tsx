// @vitest-environment jsdom
/**
 * business-card 组件测试
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

describe('business-card · Tool', () => {
  it('渲染后 7 个必需 data-testid + 附加字段输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'input-title',
      'input-company',
      'input-phone',
      'input-email',
      'input-website',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 SVG 代码', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('<svg')
    expect(output).toContain('陈静')
  })

  it('点清空回到空态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(byTestId('output').textContent).toContain('（空）')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('只填电话不填姓名进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-phone'), { target: { value: '123' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('请填写姓名')
  })

  it('XML 特殊字符被转义', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<陈静>' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('&lt;陈静&gt;')
    expect(output).not.toContain('<陈静>')
  })
})
