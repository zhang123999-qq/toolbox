// @vitest-environment jsdom
/**
 * physics 组件测试（#791）：物理参数。
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

describe('physics · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('physics-calc')).toBeTruthy()
  })

  it('斜抛计算输出射程', () => {
    render(<Tool />)
    fireEvent.click(byTestId('physics-calc'))
    const out = byTestId('physics-output')
    expect(out.textContent).toContain('斜抛运动')
    expect(out.textContent).toContain('射程 = 10.2041')
  })

  it('切换到自由落体模式计算', () => {
    render(<Tool />)
    fireEvent.click(byTestId('physics-mode-fall'))
    fireEvent.change(byTestId('input'), { target: { value: '{"h":4.9}' } })
    fireEvent.click(byTestId('physics-calc'))
    expect(byTestId('physics-output').textContent).toContain('下落时间 = 1')
  })

  it('弹性碰撞模式计算', () => {
    render(<Tool />)
    fireEvent.click(byTestId('physics-mode-collision'))
    fireEvent.change(byTestId('input'), { target: { value: '{"m1":1,"v1":5,"m2":1,"v2":-3}' } })
    fireEvent.click(byTestId('physics-calc'))
    expect(byTestId('physics-output').textContent).toContain('v1 = -3')
  })

  it('非法 JSON 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xxx' } })
    fireEvent.click(byTestId('physics-calc'))
    expect(byTestId('physics-error').textContent).toContain('合法 JSON')
  })

  it('非法参数显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"v0":10,"angleDeg":0}' } })
    fireEvent.click(byTestId('physics-calc'))
    expect(byTestId('physics-error').textContent).toContain('(0, 90)')
  })
})
