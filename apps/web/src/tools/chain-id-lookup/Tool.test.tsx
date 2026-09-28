// @vitest-environment jsdom
/**
 * chain-id-lookup 组件测试（#715）：输入变化实时输出查询结果；错误态行内展示。
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

describe('chain-id-lookup · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入链 ID 实时展示结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '137' } })
    expect(byTestId('output').textContent).toContain('Polygon')
    expect(byTestId('output').textContent).toContain('0x89')
  })

  it('点示例填入示例并展示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('8453')
    expect(byTestId('output').textContent).toContain('Base')
  })

  it('查不到的 ID 行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '99999999' } })
    expect(byTestId('output').textContent).toContain('未找到链 ID')
  })

  it('按名称搜索展示多条', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'Sepolia' } })
    expect(byTestId('output').textContent).toContain('---')
  })
})
