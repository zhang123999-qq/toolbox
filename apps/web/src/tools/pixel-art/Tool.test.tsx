// @vitest-environment jsdom
/**
 * pixel-art 组件测试（#789）：像素画。
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

describe('pixel-art · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['pixelart-canvas', 'pixelart-new', 'pixelart-export', 'pixelart-undo', 'pixelart-mirrorh', 'pixelart-mirrorv']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('初始输出显示 16×16', () => {
    render(<Tool />)
    expect(byTestId('pixelart-output').textContent).toContain('16×16')
  })

  it('新建画布更新尺寸', () => {
    render(<Tool />)
    fireEvent.change(byTestId('pixelart-size'), { target: { value: '8' } })
    fireEvent.click(byTestId('pixelart-new'))
    expect(byTestId('pixelart-output').textContent).toContain('8×8')
  })

  it('非法尺寸显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('pixelart-size'), { target: { value: '0' } })
    fireEvent.click(byTestId('pixelart-new'))
    expect(byTestId('pixelart-error').textContent).toContain('正整数')
  })

  it('切换模式按钮可用', () => {
    render(<Tool />)
    fireEvent.click(byTestId('pixelart-mode-fill'))
    expect(byTestId('pixelart-mode-fill')).toBeTruthy()
  })

  it('撤销按钮初始禁用', () => {
    render(<Tool />)
    expect((byTestId('pixelart-undo') as HTMLButtonElement).disabled).toBe(true)
  })

  it('调色板点击切换颜色', () => {
    render(<Tool />)
    fireEvent.click(byTestId('pixelart-swatch-ff0000'))
    expect((byTestId('pixelart-color') as HTMLInputElement).value).toBe('#ff0000')
  })
})
