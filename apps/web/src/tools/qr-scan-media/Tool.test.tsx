// @vitest-environment jsdom
/**
 * qr-scan-media 组件测试
 *
 * jsqr 动态导入整体 mock：覆盖解码成功 / 未识别 / 组件加载失败分支；
 * getUserMedia / Image / canvas 全部 mock，不做真实调用。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

let jsqrResult: { data: string } | null = { data: 'https://example.com/qr' }
let jsqrShouldThrow = false

vi.mock('jsqr', () => ({
  default: vi.fn((..._args: unknown[]) => {
    if (jsqrShouldThrow) throw new Error('decode boom')
    return jsqrResult
  }),
}))

let getUserMediaImpl: (() => Promise<unknown>) | null = null

const fakeStream = { getTracks: () => [{ stop: vi.fn() }] }

const fakeImageData = {
  width: 100,
  height: 100,
  data: new Uint8ClampedArray(100 * 100 * 4),
}

function stubBrowserApis(): void {
  jsqrResult = { data: 'https://example.com/qr' }
  jsqrShouldThrow = false
  getUserMediaImpl = async () => fakeStream
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: () => getUserMediaImpl!(),
    },
  })
  window.HTMLVideoElement.prototype.play = vi.fn(
    async () => undefined,
  ) as unknown as () => Promise<void>
  Object.defineProperty(window.HTMLVideoElement.prototype, 'videoWidth', {
    value: 640,
    configurable: true,
  })
  Object.defineProperty(window.HTMLVideoElement.prototype, 'videoHeight', {
    value: 480,
    configurable: true,
  })
  const ctx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => fakeImageData),
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

beforeEach(stubBrowserApis)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('qr-scan-media · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    const { container } = render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('open-camera')).toBeTruthy()
    // select 选项由模板渲染为无 testid 的下拉框，用选择器定位
    expect(container.querySelector('select')).toBeTruthy()
  })

  it('摄像头模式：打开 → 扫描 → 显示解码结果与网址提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('scan-camera')).toBeTruthy())
    fireEvent.click(byTestId('scan-camera'))
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('解码成功')
    expect(info).toContain('https://example.com/qr')
    expect(info).toContain('疑似网址')
  })

  it('未识别到二维码 → 中文提示', async () => {
    jsqrResult = null
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('scan-camera')).toBeTruthy())
    fireEvent.click(byTestId('scan-camera'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('未在画面中识别到二维码')
  })

  it('jsqr 解码抛错 → 中文错误提示', async () => {
    jsqrShouldThrow = true
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('scan-camera')).toBeTruthy())
    fireEvent.click(byTestId('scan-camera'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('decode boom')
  })

  it('摄像头权限拒绝 → 中文提示', async () => {
    getUserMediaImpl = async () => {
      throw new DOMException('denied', 'NotAllowedError')
    }
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('摄像头权限被拒绝')
  })

  it('图片模式：选择图片后自动扫描并显示结果', async () => {
    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      naturalWidth = 200
      naturalHeight = 200
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    vi.stubGlobal('Image', MockImage)
    const { container } = render(<Tool />)
    const select = container.querySelector('select')
    if (!select) throw new Error('缺少扫描来源下拉框')
    fireEvent.change(select, { target: { value: 'image' } })
    await waitFor(() => expect(byTestId('file')).toBeTruthy())
    const file = new File([new Uint8Array([1, 2, 3])], 'qr.png', { type: 'image/png' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('解码成功')
  })
})
