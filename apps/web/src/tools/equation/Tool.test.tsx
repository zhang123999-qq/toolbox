// @vitest-environment jsdom
/**
 * equation 组件测试
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

describe('equation · Tool', () => {
  it('渲染后 7 个必需 data-testid + 类型选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByRole('combobox')).toBeTruthy() // 类型选项（select 无 data-testid，走 role）
  })

  it('点示例后输出判别式与两个根', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('Δ = 1')
    expect(output).toContain('x₁ = 2')
    expect(output).toContain('x₂ = 3')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('切换到一元一次即时重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2x+3=0' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'linear' } })
    expect(byTestId('output').textContent).toContain('解：x = -1.5')
  })

  it('切换到方程组模式解二元一次方程组', () => {
    render(<Tool />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'system' } })
    fireEvent.change(byTestId('input'), { target: { value: '2x+3y=5\nx-y=1' } })
    expect(byTestId('output').textContent).toContain('解：x = 1.6，y = 0.6')
  })

  it('缺少等号进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2x+3' } })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('等号')
  })
})
