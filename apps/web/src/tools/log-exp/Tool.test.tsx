// @vitest-environment jsdom
/**
 * log-exp 组件测试
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

describe('log-exp · Tool', () => {
  it('渲染后 7 个必需 data-testid + 底数输入框 + 函数选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
    expect(screen.getByRole('combobox')).toBeTruthy() // 函数选项（select 无 data-testid，走 role）
  })

  it('点示例后输出 lg(100)=2', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('log_10(100) = 2')
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

  it('切换到 2 的幂即时重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '10' } })
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'pow2' } })
    expect(byTestId('output').textContent).toContain('2^10 = 1024')
  })

  it('自定义底数模式填写底数求值', () => {
    render(<Tool />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'logbase' } })
    fireEvent.change(byTestId('input'), { target: { value: '81' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '3' } })
    expect(byTestId('output').textContent).toContain('log_3(81) = 4')
  })

  it('真数为 0 进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
