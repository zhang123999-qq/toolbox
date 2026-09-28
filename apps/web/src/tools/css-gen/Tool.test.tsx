// @vitest-environment jsdom
/**
 * css-gen 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('css-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-duration')).toBeTruthy()
  })

  it('默认生成 bounce 动画', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('@keyframes bounce {')
    expect(out).toContain('animation: bounce 1s ease;')
  })

  it('点示例生成 pulse 动画', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('@keyframes pulse {')
  })

  it('未知动画名进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'wiggle' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('未知动画预设')
  })

  it('非法时长进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-duration'), { target: { value: 'abc' } })
    const output = byTestId('output')
    expect(output.getAttribute('role')).toBe('alert')
    expect(output.textContent).toContain('时长格式非法')
  })
})
