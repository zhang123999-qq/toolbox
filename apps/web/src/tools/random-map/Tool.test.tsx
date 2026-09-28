// @vitest-environment jsdom
/**
 * random-map 组件测试（#792）：随机地图。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('random-map · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('randommap-generate')).toBeTruthy()
    expect(byTestId('randommap-random')).toBeTruthy()
    expect(byTestId('randommap-canvas')).toBeTruthy()
  })

  it('生成地图输出统计', () => {
    render(<Tool />)
    fireEvent.click(byTestId('randommap-generate'))
    const out = byTestId('randommap-output')
    expect(out.textContent).toContain('地图 40×24')
    expect(out.textContent).toContain('水域')
    expect(out.textContent).toContain('≈')
  })

  it('相同种子两次生成一致', () => {
    render(<Tool />)
    fireEvent.click(byTestId('randommap-generate'))
    const first = byTestId('randommap-output').textContent
    fireEvent.click(byTestId('randommap-generate'))
    expect(byTestId('randommap-output').textContent).toBe(first)
  })

  it('随机种子按钮生成输出', () => {
    render(<Tool />)
    fireEvent.click(byTestId('randommap-random'))
    expect(byTestId('randommap-output').textContent).toContain('种子')
  })

  it('非法输入显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"w":0,"h":8,"seed":1}' } })
    fireEvent.click(byTestId('randommap-generate'))
    expect(byTestId('randommap-error').textContent).toContain('w')
  })
})
