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

describe('logo · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入也渲染出 SVG Logo', () => {
    render(<Tool />)
    expect(byTestId('logo-svg').innerHTML).toContain('<svg')
  })

  it('点示例后输出品牌名', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('logo-svg').innerHTML).toContain('Acme')
  })

  it('点清空回到空输入且不报错', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('切换风格后 SVG 跟随变化', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    // 默认 minimal；切到 gradient 应出现 linearGradient
    fireEvent.change(screen.getByLabelText('风格'), { target: { value: 'gradient' } })
    expect(byTestId('logo-svg').innerHTML).toContain('<linearGradient')
  })
})
