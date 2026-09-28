// @vitest-environment jsdom
/**
 * body-fat 组件测试
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

describe('body-fat · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出男性体脂率', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('体脂率：16.9%')
    expect(out).toContain('分级：健康（男性标准）')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-textD') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切换性别到女：示例缺臀围进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '女' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('女性需填写臀围')
  })

  it('女性填齐四项后输出女性标准', () => {
    render(<Tool />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '女' } })
    fireEvent.change(byTestId('input'), { target: { value: '70' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '32' } })
    fireEvent.change(byTestId('input-textC'), { target: { value: '165' } })
    fireEvent.change(byTestId('input-textD'), { target: { value: '95' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('体脂率：24.9%')
    expect(out).toContain('女性标准')
  })

  it('男性腰围 ≤ 颈围进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '38' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '38' } })
    fireEvent.change(byTestId('input-textC'), { target: { value: '175' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('腰围必须大于颈围')
  })
})
