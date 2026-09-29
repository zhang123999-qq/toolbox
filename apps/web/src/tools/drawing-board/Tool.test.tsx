// @vitest-environment jsdom
/**
 * drawing-board 组件测试（#798）：在线画图（中度改造版）。
 * 含历史记录逻辑测试：用 mock 画布实证"操作完成后记录完成态"——
 * 撤销回到操作前、重做恢复操作后、撤销后新画清空 redo 分支。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    byTestId('drawing-fullscreen')
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

describe('drawing-board · 历史记录', () => {
  let urlCounter = 0
  const restoredUrls: string[] = []

  class MockImage {
    onload: (() => void) | null = null
    set src(v: string) {
      restoredUrls.push(v)
      if (this.onload) this.onload()
    }
    get src(): string {
      return ''
    }
  }

  function fakeCtx(): Record<string, unknown> {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: '',
      lineJoin: '',
      globalAlpha: 1,
      font: '',
      textBaseline: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4),
      }),
      putImageData: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      rect: vi.fn(),
      ellipse: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
    }
  }

  const origGetContext = HTMLCanvasElement.prototype.getContext
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL
  const origSetPointerCapture = window.HTMLElement.prototype.setPointerCapture

  beforeEach(() => {
    urlCounter = 0
    restoredUrls.length = 0
    vi.stubGlobal('Image', MockImage)
    window.HTMLElement.prototype.setPointerCapture = (): void => {}
    HTMLCanvasElement.prototype.getContext = (() =>
      fakeCtx()) as unknown as typeof origGetContext
    HTMLCanvasElement.prototype.toDataURL = (() =>
      `mock-url-${urlCounter++}`) as unknown as typeof origToDataURL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    HTMLCanvasElement.prototype.getContext = origGetContext
    HTMLCanvasElement.prototype.toDataURL = origToDataURL
    window.HTMLElement.prototype.setPointerCapture = origSetPointerCapture
  })

  function mockRect(canvas: HTMLElement): void {
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 960, height: 600 }) as DOMRect
  }

  function drawStroke(canvas: HTMLElement): void {
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, pointerId: 1 })
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20, pointerId: 1 })
    fireEvent.pointerUp(canvas, { pointerId: 1 })
  }

  it('画一笔 → 撤销回到空白 → 重做恢复画笔', () => {
    render(<Tool />)
    const canvas = screen.getByTestId('drawing-canvas')
    mockRect(canvas)
    const undo = screen.getByTestId('drawing-undo') as HTMLButtonElement
    const redo = screen.getByTestId('drawing-redo') as HTMLButtonElement
    expect(undo.disabled).toBe(true)

    drawStroke(canvas) // 记录 mock-url-1（完成态）
    expect(undo.disabled).toBe(false)
    expect(redo.disabled).toBe(true)

    fireEvent.click(undo)
    expect(restoredUrls.at(-1)).toBe('mock-url-0') // 回到初始空白
    expect(redo.disabled).toBe(false)

    fireEvent.click(redo)
    expect(restoredUrls.at(-1)).toBe('mock-url-1') // 恢复刚才的笔画
  })

  it('撤销后新画 → redo 分支被清空', () => {
    render(<Tool />)
    const canvas = screen.getByTestId('drawing-canvas')
    mockRect(canvas)
    const undo = screen.getByTestId('drawing-undo') as HTMLButtonElement
    const redo = screen.getByTestId('drawing-redo') as HTMLButtonElement

    drawStroke(canvas) // mock-url-1
    fireEvent.click(undo)
    expect(redo.disabled).toBe(false)

    drawStroke(canvas) // mock-url-2，应截断 redo 分支（mock-url-1 被丢弃）
    expect(redo.disabled).toBe(true)

    fireEvent.click(undo)
    expect(restoredUrls.at(-1)).toBe('mock-url-0') // 回到空白，url-1 分支已不存在
  })

  it('油漆桶填充可撤销', () => {
    render(<Tool />)
    const canvas = screen.getByTestId('drawing-canvas')
    mockRect(canvas)
    fireEvent.click(screen.getByTestId('drawing-tool-fill'))
    fireEvent.pointerDown(canvas, { clientX: 5, clientY: 5, pointerId: 1 })

    const undo = screen.getByTestId('drawing-undo') as HTMLButtonElement
    expect(undo.disabled).toBe(false)
    fireEvent.click(undo)
    expect(restoredUrls.at(-1)).toBe('mock-url-0')
  })

  it('清空可撤销', () => {
    render(<Tool />)
    const canvas = screen.getByTestId('drawing-canvas')
    mockRect(canvas)
    drawStroke(canvas) // mock-url-1
    fireEvent.click(screen.getByTestId('drawing-clear')) // mock-url-2

    const undo = screen.getByTestId('drawing-undo') as HTMLButtonElement
    fireEvent.click(undo)
    expect(restoredUrls.at(-1)).toBe('mock-url-1') // 回到有笔画的状态
  })
})
