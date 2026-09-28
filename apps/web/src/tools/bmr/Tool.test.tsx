// @vitest-environment jsdom
/**
 * bmr 组件测试
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

describe('bmr · Tool', () => {
  it('渲染后 7 个必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后输出 BMR 1648.8', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('BMR：1648.8 kcal/天（Mifflin-St Jeor，男，30 岁）')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-textB') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切换公式到 Harris-Benedict', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: 'Harris-Benedict' } })
    expect(byTestId('output').textContent).toBe('BMR：1695.7 kcal/天（Harris-Benedict，男，30 岁）')
  })

  it('切换性别到女', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: '女' } })
    expect(byTestId('output').textContent).toContain(
      'BMR：1482.8 kcal/天（Mifflin-St Jeor，女，30 岁）',
    )
  })

  it('改年龄选项后输出跟随', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-age'), { target: { value: '31' } })
    expect(byTestId('output').textContent).toContain('31 岁')
  })

  it('非法年龄进入错误态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-age'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('年龄应为 1–120 的整数')
  })
})
