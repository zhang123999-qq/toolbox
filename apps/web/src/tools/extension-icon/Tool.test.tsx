// @vitest-environment jsdom
/**
 * extension-icon 组件测试（#774）：图标生成与预览。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function stubCanvas(): void {
  const ctx = {
    fillStyle: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ctx as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
    () => 'data:image/png;base64,AAA',
  )
}

describe('extension-icon · Tool', () => {
  beforeEach(() => {
    stubCanvas()
  })

  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('extensionicon-run')).toBeTruthy()
  })

  it('示例参数生成三档图标预览', () => {
    render(<Tool />)
    fireEvent.click(byTestId('extensionicon-run'))
    expect(byTestId('extensionicon-output')).toBeTruthy()
    for (const size of [16, 48, 128]) {
      const img = byTestId(`extensionicon-preview-${size}`) as HTMLImageElement
      expect(img.getAttribute('src')).toBe('data:image/png;base64,AAA')
      const link = byTestId(`extensionicon-download-${size}`) as HTMLAnchorElement
      expect(link.getAttribute('download')).toBe(`icon${size}.png`)
    }
  })

  it('非法颜色报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"size":48,"bg":"red","fg":"#ffffff","letter":"T","shape":"circle"}' },
    })
    fireEvent.click(byTestId('extensionicon-run'))
    expect(byTestId('extensionicon-error').textContent).toContain('bg 必须是 #rrggbb')
  })

  it('canvas 不可用时报错', () => {
    vi.restoreAllMocks()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
    render(<Tool />)
    fireEvent.click(byTestId('extensionicon-run'))
    expect(byTestId('extensionicon-error').textContent).toContain('无法获取 2d 绘图上下文')
  })
})
