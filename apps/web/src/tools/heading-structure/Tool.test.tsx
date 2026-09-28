// @vitest-environment jsdom
/**
 * heading-structure 组件测试（#732）：输入 HTML 实时输出评分与大纲。
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

describe('heading-structure · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入规范 HTML 输出满分报告', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<h1>标题</h1><h2>小节</h2>' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('100 分')
    expect(out).toContain('未发现结构问题 ✓')
  })

  it('问题 HTML 输出警告', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<h1>A</h1><h3>B</h3>' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('层级跳跃')
    expect(out).toContain('90 分')
  })

  it('点示例填入并检出示例问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('标题总数：5')
    expect(out).toContain('2 个 h1')
  })
})
