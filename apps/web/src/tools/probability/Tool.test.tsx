// @vitest-environment jsdom
/**
 * probability 组件测试
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

describe('probability · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出二项分布五项', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('P(X = k): 0.117188')
    expect(output).toContain('期望 E[X]: 5')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入显示格式提示，不进入错误态', () => {
    render(<Tool />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('n=10')
  })

  it('缺失参数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'n=10\nk=3' } })
    expect(screen.queryByRole('alert')).not.toBeNull()
    expect(screen.getByRole('alert').textContent).toContain('缺少参数：p')
  })

  it('切换到条件概率模式后按新格式计算', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'conditional' } })
    fireEvent.change(byTestId('input'), { target: { value: 'pa=0.6\npb=0.4\npab=0.24' } })
    expect(byTestId('output').textContent).toContain('P(A|B): 0.6')
  })

  it('切换到正态分布模式后按新格式计算', () => {
    render(<Tool />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'normal' } })
    fireEvent.change(byTestId('input'), { target: { value: 'x=1.96\nmu=0\nsigma=1' } })
    expect(byTestId('output').textContent).toContain('P(X ≤ x): 0.975002')
  })
})
