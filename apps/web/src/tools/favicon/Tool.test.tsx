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

describe('favicon · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('export-png')).toBeTruthy()
  })

  it('空输入也渲染出 favicon SVG', () => {
    render(<Tool />)
    expect(byTestId('favicon-svg').innerHTML).toContain('<svg')
  })

  it('点示例后输出首字母 F', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('favicon-svg').innerHTML).toContain('>F</text>')
  })

  it('非法尺寸进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-size'), { target: { value: '999' } })
    expect(within(byTestId('output')).getByRole('alert').textContent).toContain('尺寸必须是')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
