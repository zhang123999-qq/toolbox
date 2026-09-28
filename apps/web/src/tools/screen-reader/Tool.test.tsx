// @vitest-environment jsdom
/**
 * screen-reader 组件测试（#718）：输入 HTML 实时输出朗读大纲与问题。
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

describe('screen-reader · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 HTML 实时输出大纲', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<h1>你好</h1>' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('[h1] 你好')
    expect(out).toContain('未发现问题')
  })

  it('问题 HTML 输出警告与错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '<h1>a</h1><h3>b</h3><img src="x.png"><a href="/x"></a>' },
    })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('标题层级跳跃')
    expect(out).toContain('缺少 alt')
    expect(out).toContain('✗')
  })

  it('点示例填入并检出示例问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('[h1] 文章标题')
    expect(out).toContain('点击这里')
  })
})
