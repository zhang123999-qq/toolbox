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

describe('placeholder · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入渲染默认占位图', () => {
    render(<Tool />)
    const html = byTestId('placeholder-svg').innerHTML
    expect(html).toContain('<svg')
    expect(html).toContain('width="400"')
  })

  it('点示例后输出 300x200 占位图', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const html = byTestId('placeholder-svg').innerHTML
    expect(html).toContain('width="300"')
    expect(html).toContain('height="200"')
    expect(html).toContain('300 × 200')
  })

  it('非法尺寸进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(within(byTestId('output')).getByRole('alert').textContent).toContain('尺寸格式不正确')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
