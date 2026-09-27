// @vitest-environment jsdom
/**
 * matrix 组件测试
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

describe('matrix · Tool', () => {
  it('渲染后 7 个必需 data-testid + 矩阵 B 输入框 + 运算选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
    expect(screen.getByRole('combobox')).toBeTruthy() // 运算选项（select 无 data-testid，走 role）
  })

  it('点示例后输出逆矩阵', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('逆矩阵')
    expect(output).toContain('-2')
    expect(output).toContain('1.5')
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

  it('切换运算到行列式即时重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1 2\n3 4' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'determinant' } })
    expect(byTestId('output').textContent).toContain('det(A) = -2')
  })

  it('输入非矩形进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1 2\n3' } })
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain('不是矩形')
  })
})
