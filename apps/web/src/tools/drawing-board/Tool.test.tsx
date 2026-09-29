// @vitest-environment jsdom
/**
 * drawing-board 组件测试（#798）：在线画图（中度改造版）。
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

const ALL_TOOLS = [
  'brush',
  'spray',
  'marker',
  'line',
  'arrow',
  'rect',
  'ellipse',
  'triangle',
  'diamond',
  'star',
  'text',
  'eraser',
  'fill',
]

describe('drawing-board · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    byTestId('drawing-canvas')
    byTestId('drawing-export')
    byTestId('drawing-export-jpg')
    byTestId('drawing-undo')
    byTestId('drawing-redo')
    byTestId('drawing-clear')
    byTestId('drawing-color')
    byTestId('drawing-width')
    byTestId('drawing-canvassize')
    byTestId('drawing-bgcolor')
    byTestId('drawing-upload')
    for (const t of ALL_TOOLS) {
      byTestId('drawing-tool-' + t)
    }
  })

  it('默认画布尺寸为 960x600', () => {
    render(<Tool />)
    const canvas = byTestId('drawing-canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(960)
    expect(canvas.height).toBe(600)
  })

  it('初始撤销/重做不可用', () => {
    render(<Tool />)
    expect((byTestId('drawing-undo') as HTMLButtonElement).disabled).toBe(true)
    expect((byTestId('drawing-redo') as HTMLButtonElement).disabled).toBe(true)
  })

  it('选中图形工具后出现填充模式切换', () => {
    render(<Tool />)
    expect(screen.queryByTestId('drawing-fillmode')).toBeNull()
    fireEvent.click(byTestId('drawing-tool-rect'))
    byTestId('drawing-fillmode')
    byTestId('drawing-fillmode-stroke')
    byTestId('drawing-fillmode-fill')
    byTestId('drawing-fillmode-both')
  })

  it('选中文本工具后出现字号选择', () => {
    render(<Tool />)
    expect(screen.queryByTestId('drawing-fontsize')).toBeNull()
    fireEvent.click(byTestId('drawing-tool-text'))
    byTestId('drawing-fontsize')
  })

  it('模板的输入/输出区存在', () => {
    render(<Tool />)
    byTestId('input')
    byTestId('output')
  })
})
