// @vitest-environment jsdom
/**
 * drawing-board 组件测试（#798）：在线画图。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('drawing-board · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    byTestId('drawing-canvas')
    byTestId('drawing-export')
    byTestId('drawing-undo')
    byTestId('drawing-redo')
    byTestId('drawing-clear')
    byTestId('drawing-color')
    byTestId('drawing-width')
    for (const t of ['brush', 'line', 'rect', 'ellipse', 'eraser', 'fill']) {
      byTestId('drawing-tool-' + t)
    }
  })

  it('画布尺寸为 960x600', () => {
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

  it('模板的输入/输出区存在', () => {
    render(<Tool />)
    byTestId('input')
    byTestId('output')
  })
})
