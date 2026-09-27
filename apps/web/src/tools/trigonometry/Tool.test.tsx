// @vitest-environment jsdom
/**
 * trigonometry 组件测试
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

describe('trigonometry · Tool', () => {
  it('渲染后 7 个必需 data-testid + 角度单位选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByRole('combobox')).toBeTruthy() // 角度单位选项（select 无 data-testid，走 role）
  })

  it('点示例后输出 30° 的六个函数值', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('sin = 0.5')
    expect(output).toContain('cos = 0.866025403784')
    expect(output).toContain('cot = 1.73205080757')
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

  it('手动输入 90° 显示无定义', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '90' } })
    expect(byTestId('output').textContent).toContain('tan = 无定义')
  })

  it('切换到弧度模式重算', () => {
    render(<Tool />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'rad' } })
    fireEvent.change(byTestId('input'), { target: { value: String(Math.PI / 2) } })
    expect(byTestId('output').textContent).toContain('sin = 1')
  })

  it('输入非数字进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
