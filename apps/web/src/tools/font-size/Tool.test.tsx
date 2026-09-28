// @vitest-environment jsdom
/**
 * font-size 组件测试（#738）：流式字号、可读性评估、px/rem 换算。
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

describe('font-size · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'min-px',
      'max-px',
      'min-vw',
      'max-vw',
      'fluid-output',
      'fs-px',
      'line-chars',
      'line-height',
      'readability-result',
      'conv-value',
      'conv-dir',
      'conv-result',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成 clamp 流式字号', () => {
    render(<Tool />)
    expect(byTestId('fluid-output').textContent).toContain(
      'font-size: clamp(16px, 13.0909px + 0.9091vw, 24px);',
    )
  })

  it('修改最大字号实时更新', () => {
    render(<Tool />)
    fireEvent.change(byTestId('max-px'), { target: { value: '32' } })
    expect(byTestId('fluid-output').textContent).toContain(', 32px);')
  })

  it('非法视口显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('max-vw'), { target: { value: '100' } })
    expect(byTestId('fluid-error').textContent).toContain('最大视口必须大于最小视口')
    expect(screen.queryByTestId('fluid-output')).toBeNull()
  })

  it('默认可读性满分', () => {
    render(<Tool />)
    const r = byTestId('readability-result').textContent ?? ''
    expect(r).toContain('可读性评分：100 / 100')
    expect(r).toContain('均在舒适区间')
  })

  it('小字号显示问题与建议', () => {
    render(<Tool />)
    fireEvent.change(byTestId('fs-px'), { target: { value: '12' } })
    const r = byTestId('readability-result').textContent ?? ''
    expect(r).toContain('可读性评分：80 / 100')
    expect(r).toContain('偏小')
    expect(r).toContain('16px')
  })

  it('px → rem 换算', () => {
    render(<Tool />)
    expect(byTestId('conv-result').textContent).toContain('16px = 1rem')
    fireEvent.change(byTestId('conv-dir'), { target: { value: 'rem2px' } })
    expect(byTestId('conv-result').textContent).toContain('16rem = 256px')
  })

  it('换算非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('conv-value'), { target: { value: '-5' } })
    expect(byTestId('conv-error').textContent).toContain('不能为负数')
  })
})
