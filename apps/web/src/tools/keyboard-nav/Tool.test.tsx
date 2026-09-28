// @vitest-environment jsdom
/**
 * keyboard-nav 组件测试（#719）：输入 HTML 实时输出分析结果。
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

describe('keyboard-nav · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 HTML 实时输出统计', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<a href="#c">跳过</a><button>确定</button>' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('可聚焦元素：2 个')
    expect(out).toContain('未发现问题 ✓')
  })

  it('问题 HTML 输出警告与错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '<button tabindex="2">a</button><div onclick="g()">x</div>' },
    })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('正 tabindex')
    expect(out).toContain('模拟可交互元素')
  })

  it('点示例填入并检出示例问题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('可聚焦元素：5 个')
    expect(out).toContain('共用 tabindex="1"')
  })
})
