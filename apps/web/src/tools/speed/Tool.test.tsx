// @vitest-environment jsdom
/**
 * speed 组件测试
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

describe('speed · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 100 km/h = 27.7777777778 m/s', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('100 km/h = 27.7777777778 m/s')
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

  it('手工输入 1 m/s → km/h（需先改选项）', () => {
    render(<Tool />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'm/s' } })
    fireEvent.change(selects[1], { target: { value: 'km/h' } })
    fireEvent.change(byTestId('input'), { target: { value: '1' } })
    expect(byTestId('output').textContent).toBe('1 m/s = 3.6 km/h')
  })

  it('输入非法数字进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('请输入有效的数字')
  })
})
