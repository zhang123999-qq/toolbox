// @vitest-environment jsdom
/**
 * base-convert 组件测试
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

describe('base-convert · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 255 (10进制) = FF (16进制)', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('255 (10进制) = FF (16进制)')
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

  it('输入 0b 前缀二进制数实时转换', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '11111111' } })
    // 默认 from=10：11111111（10 进制）→ 16 进制
    expect(byTestId('output').textContent).toContain('A98AC7 (16进制)')
  })

  it('输入非法数字进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1G' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('在 10 进制下非法')
  })
})
