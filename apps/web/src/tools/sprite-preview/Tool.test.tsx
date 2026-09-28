// @vitest-environment jsdom
/**
 * sprite-preview 组件测试（#799）：精灵图预览。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('sprite-preview · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'spritepreview-fps',
      'spritepreview-loop',
      'spritepreview-build',
      'spritepreview-toggle',
      'spritepreview-step',
      'spritepreview-canvas',
      'spritepreview-status',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('构建前播放按钮禁用', () => {
    render(<Tool />)
    expect((byTestId('spritepreview-toggle') as HTMLButtonElement).disabled).toBe(true)
    expect(byTestId('spritepreview-status').textContent).toContain('点击「构建预览」')
  })

  it('空输入构建显示错误', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('input'), { target: { value: '' } })
    fireEvent.click(byTestId('spritepreview-build'))
    expect(byTestId('spritepreview-error').textContent).toContain('没有帧可预览')
  })

  it('非法 fps 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('spritepreview-fps'), { target: { value: '0' } })
    fireEvent.click(byTestId('spritepreview-build'))
    expect(byTestId('spritepreview-error').textContent).toContain('fps')
  })

  it('构建后状态显示帧数与播放按钮可用', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    render(<Tool />)
    fireEvent.click(byTestId('spritepreview-build'))
    expect((byTestId('spritepreview-toggle') as HTMLButtonElement).disabled).toBe(false)
    expect(byTestId('spritepreview-status').textContent).toContain('帧 1/4')
    expect(byTestId('spritepreview-toggle').textContent).toContain('暂停')
  })

  it('暂停与单步按钮可用', () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    render(<Tool />)
    fireEvent.click(byTestId('spritepreview-build'))
    fireEvent.click(byTestId('spritepreview-toggle'))
    expect(byTestId('spritepreview-toggle').textContent).toContain('播放')
    fireEvent.click(byTestId('spritepreview-step'))
    expect(byTestId('spritepreview-status').textContent).toContain('帧 2/4')
  })
})
