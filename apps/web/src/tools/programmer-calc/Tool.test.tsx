// @vitest-environment jsdom
/**
 * programmer-calc 组件测试
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

describe('programmer-calc · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出四进制对照', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('十进制：14')
    expect(output).toContain('十六进制：0xE')
    expect(output).toContain('八进制：0o16')
    expect(output).toContain('二进制：0b1110')
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

  it('输入位运算表达式实时输出对照', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1<<10' } })
    expect(byTestId('output').textContent).toContain('十进制：1024')
  })

  it('输入小数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '3.5+1' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('仅支持整数运算')
  })
})
