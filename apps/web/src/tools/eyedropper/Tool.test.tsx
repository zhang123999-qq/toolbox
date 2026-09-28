// @vitest-environment jsdom
/**
 * eyedropper 组件测试
 *
 * EyeDropper / Image / canvas 全部 mock，不做真实调用。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

let eyeDropperHex: string | null = '#ff6b00'
let eyeDropperShouldAbort = false

class MockEyeDropper {
  async open(): Promise<{ sRGBHex: string }> {
    if (eyeDropperShouldAbort) {
      const err = new DOMException('aborted', 'AbortError')
      throw err
    }
    if (eyeDropperHex === null) throw new Error('picker broken')
    return { sRGBHex: eyeDropperHex }
  }
}

const fakePixels = new Uint8ClampedArray([
  255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
])

function stubBrowserApis(withEyeDropper: boolean): void {
  eyeDropperHex = '#ff6b00'
  eyeDropperShouldAbort = false
  if (withEyeDropper) {
    vi.stubGlobal('EyeDropper', undefined)
    ;(window as unknown as { EyeDropper?: unknown }).EyeDropper =
      MockEyeDropper as unknown as new () => { open: () => Promise<{ sRGBHex: string }> }
  } else {
    vi.stubGlobal('EyeDropper', undefined)
    delete (window as unknown as { EyeDropper?: unknown }).EyeDropper
  }
  class MockImage {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    naturalWidth = 2
    naturalHeight = 2
    set src(_value: string) {
      setTimeout(() => this.onload?.(), 0)
    }
  }
  vi.stubGlobal('Image', MockImage)
  const ctx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ width: 2, height: 2, data: fakePixels })),
  }
  window.HTMLCanvasElement.prototype.getContext = vi.fn(
    () => ctx,
  ) as unknown as typeof window.HTMLCanvasElement.prototype.getContext
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
  })
}

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('eyedropper · Tool', () => {
  beforeEach(() => stubBrowserApis(true))

  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('system-pick')).toBeTruthy()
    expect(byTestId('manual-parse')).toBeTruthy()
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('option-radius')).toBeTruthy()
  })

  it('从屏幕取色 → 色块与三行报告出现', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('system-pick'))
    await waitFor(() => expect(byTestId('color-swatch')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('HEX：#ff6b00')
    expect(info).toContain('RGB：rgb(255, 107, 0)')
    expect(info).toContain('HSL：')
    expect((byTestId('color-swatch') as HTMLElement).style.backgroundColor).toBe('rgb(255, 107, 0)')
  })

  it('用户取消取色（AbortError）→ 轻提示', async () => {
    eyeDropperShouldAbort = true
    render(<Tool />)
    fireEvent.click(byTestId('system-pick'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('已取消取色')
  })

  it('取色器抛其他错 → 中文错误提示', async () => {
    eyeDropperHex = null
    render(<Tool />)
    fireEvent.click(byTestId('system-pick'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('取色失败：picker broken')
  })

  it('手动输入颜色值 → 解析并展示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '#00ff00' } })
    fireEvent.click(byTestId('manual-parse'))
    await waitFor(() => expect(byTestId('color-swatch')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('HEX：#00ff00')
  })

  it('手动输入非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'notacolor' } })
    fireEvent.click(byTestId('manual-parse'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('颜色格式非法')
  })

  it('上传图片后点击取色 → 显示采样颜色', async () => {
    render(<Tool />)
    const file = new File([new Uint8Array([1, 2, 3])], 'pic.png', { type: 'image/png' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('image-canvas').classList.contains('hidden')).toBe(false), {
      timeout: 10000,
    })
    // jsdom 的 getBoundingClientRect 默认返回 0 宽高，给一个真实尺寸以便换算采样坐标
    const canvas = byTestId('image-canvas')
    canvas.getBoundingClientRect = () => ({ width: 2, height: 2, left: 0, top: 0 }) as DOMRect
    fireEvent.click(canvas, { clientX: 0, clientY: 0 })
    await waitFor(() => expect(byTestId('color-swatch')).toBeTruthy(), { timeout: 10000 })
    // (0,0) 半径 2 覆盖全图 2×2：红绿蓝白平均 = #808080
    expect(byTestId('result-info').textContent).toContain('HEX：#808080')
  })
})

describe('eyedropper · Tool（无 EyeDropper API）', () => {
  beforeEach(() => stubBrowserApis(false))

  it('不支持系统取色器 → 中文提示用图片取色', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('system-pick'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('不支持系统取色器')
  })
})
