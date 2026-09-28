// @vitest-environment jsdom
/**
 * animation-frame 组件测试（#797）：动画帧。
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

describe('animation-frame · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['animframe-name', 'animframe-loop', 'animframe-sprite', 'animframe-duration', 'animframe-add', 'animframe-list', 'animframe-time', 'animframe-current']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('添加帧后列表与总数更新', () => {
    render(<Tool />)
    fireEvent.change(byTestId('animframe-sprite'), { target: { value: 'jump1' } })
    fireEvent.change(byTestId('animframe-duration'), { target: { value: '150' } })
    fireEvent.click(byTestId('animframe-add'))
    expect(byTestId('animframe-frame-0').textContent).toContain('jump1')
    expect(byTestId('animframe-total').textContent).toContain('150ms')
  })

  it('非法时长显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('animframe-duration'), { target: { value: '0' } })
    fireEvent.click(byTestId('animframe-add'))
    expect(byTestId('animframe-error').textContent).toContain('帧时长')
  })

  it('删除帧', () => {
    render(<Tool />)
    fireEvent.click(byTestId('animframe-add'))
    expect(byTestId('animframe-frame-0')).toBeTruthy()
    fireEvent.click(byTestId('animframe-del-0'))
    expect(screen.queryByTestId('animframe-frame-0')).toBeNull()
  })

  it('时间轴定位当前帧', () => {
    render(<Tool />)
    fireEvent.change(byTestId('animframe-sprite'), { target: { value: 'a' } })
    fireEvent.change(byTestId('animframe-duration'), { target: { value: '100' } })
    fireEvent.click(byTestId('animframe-add'))
    fireEvent.change(byTestId('animframe-sprite'), { target: { value: 'b' } })
    fireEvent.click(byTestId('animframe-add'))
    fireEvent.change(byTestId('animframe-time'), { target: { value: '150' } })
    expect(byTestId('animframe-current').textContent).toContain('#1 b')
  })
})
