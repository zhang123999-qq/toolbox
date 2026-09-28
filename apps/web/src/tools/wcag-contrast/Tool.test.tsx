// @vitest-environment jsdom
/**
 * wcag-contrast 组件测试（#716）：输入颜色实时出对比度；非法颜色行内报错。
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

function setBg(value: string) {
  fireEvent.change(byTestId('input-bg'), { target: { value } })
}

describe('wcag-contrast · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('黑白对比度 21:1 且全通过', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '#000000' } })
    setBg('#ffffff')
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('21 : 1')
    expect(out).toContain('正文 AAA（≥7）：通过 ✓')
  })

  it('低对比度给出修复建议', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '#999999' } })
    setBg('#ffffff')
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('正文 AA（≥4.5）：不通过 ✗')
    expect(out).toContain('修复建议：把前景色改为')
  })

  it('非法颜色行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'zzz' } })
    expect(byTestId('output').textContent).toContain('无法解析的颜色')
  })

  it('点示例填入黑白示例', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('#000000')
    expect(byTestId('output').textContent).toContain('21 : 1')
  })
})
