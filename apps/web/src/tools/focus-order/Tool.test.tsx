// @vitest-environment jsdom
/**
 * focus-order 组件测试（#720）：输入 HTML 实时输出 Tab 顺序。
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

describe('focus-order · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 HTML 实时输出编号顺序', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<button>一</button><button>二</button>' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('Tab 顺序共 2 个可聚焦元素')
    expect(out).toContain(' 1. [tabindex=0] <button> "一"')
  })

  it('正 tabindex 排在前面', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '<button>自然</button><button tabindex="1">优先</button>' },
    })
    const out = byTestId('output').textContent ?? ''
    expect(out.indexOf('优先')).toBeLessThan(out.indexOf('自然'))
  })

  it('点示例填入并列出跳过元素', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('Tab 顺序共 4 个可聚焦元素')
    expect(out).toContain('跳过 Tab 顺序')
  })
})
