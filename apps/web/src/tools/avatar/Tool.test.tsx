// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('avatar · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入也渲染出 SVG 头像', () => {
    render(<Tool />)
    expect(byTestId('avatar-svg').innerHTML).toContain('<svg')
  })

  it('点示例后输出包含首字母', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('avatar-svg').innerHTML).toContain('<svg')
    expect(byTestId('avatar-svg').innerHTML).toContain('张')
  })

  it('非法尺寸进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-size'), { target: { value: '9999' } })
    expect(within(byTestId('output')).getByRole('alert').textContent).toContain('尺寸必须是')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
