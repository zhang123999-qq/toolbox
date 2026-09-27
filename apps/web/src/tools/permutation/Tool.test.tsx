// @vitest-environment jsdom
/**
 * permutation 组件测试
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

describe('permutation · Tool', () => {
  it('渲染后 7 个必需 data-testid + k 输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-k')).toBeTruthy()
  })

  it('点示例后输出排列组合数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('排列数 P(10,3) = 720')
    expect(output).toContain('组合数 C(10,3) = 120')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-k') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('k 大于 n 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '3' } })
    fireEvent.change(byTestId('input-k'), { target: { value: '5' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('输入非整数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2.5' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
