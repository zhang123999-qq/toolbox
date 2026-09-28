// @vitest-environment jsdom
/**
 * camera-photo 组件测试
 *
 * getUserMedia / video.play / canvas 2d 上下文全部 mock，不做真实调用。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

let getUserMediaImpl: (() => Promise<unknown>) | null = null
let canvasContext: { drawImage: ReturnType<typeof vi.fn> } | null = null

const fakeStream = { getTracks: () => [{ stop: vi.fn() }] }

function stubBrowserApis(): void {
  getUserMediaImpl = async () => fakeStream
  canvasContext = { drawImage: vi.fn() }
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: () => getUserMediaImpl!(),
    },
  })
  window.HTMLVideoElement.prototype.play = vi.fn(
    async () => undefined,
  ) as unknown as () => Promise<void>
  Object.defineProperty(window.HTMLVideoElement.prototype, 'videoWidth', {
    value: 1280,
    configurable: true,
  })
  Object.defineProperty(window.HTMLVideoElement.prototype, 'videoHeight', {
    value: 720,
    configurable: true,
  })
  window.HTMLCanvasElement.prototype.getContext = vi.fn(
    () => canvasContext,
  ) as unknown as typeof window.HTMLCanvasElement.prototype.getContext
  window.HTMLCanvasElement.prototype.toDataURL = vi.fn(
    () => 'data:image/png;base64,iVBORw0KGgo=',
  ) as unknown as typeof window.HTMLCanvasElement.prototype.toDataURL
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

describe('camera-photo · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('open-camera')).toBeTruthy()
    expect(byTestId('option-maxSide')).toBeTruthy()
  })

  it('打开摄像头 → 预览出现；拍照 → 照片与下载出现', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('preview')).toBeTruthy())
    expect(byTestId('capture')).toBeTruthy()
    fireEvent.click(byTestId('capture'))
    await waitFor(() => expect(byTestId('photo')).toBeTruthy())
    expect(canvasContext!.drawImage).toHaveBeenCalled()
    expect(byTestId('result-info').textContent).toContain('1280×720')
    const link = byTestId('download-photo') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toMatch(/^拍照-.*\.png$/)
  })

  it('重新拍照回到预览', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('capture')).toBeTruthy())
    fireEvent.click(byTestId('capture'))
    await waitFor(() => expect(byTestId('retake')).toBeTruthy())
    fireEvent.click(byTestId('retake'))
    expect(byTestId('capture')).toBeTruthy()
  })

  it('getUserMedia 缺失 → 中文提示换浏览器', async () => {
    vi.stubGlobal('navigator', { mediaDevices: {} })
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('不支持摄像头')
  })

  it('权限拒绝 → 中文提示去地址栏开启权限', async () => {
    getUserMediaImpl = async () => {
      throw new DOMException('denied', 'NotAllowedError')
    }
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('摄像头权限被拒绝')
  })

  it('无摄像头设备 → 中文提示检查设备', async () => {
    getUserMediaImpl = async () => {
      throw new DOMException('none', 'NotFoundError')
    }
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('未检测到可用摄像头')
  })

  it('最长边非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('open-camera'))
    await waitFor(() => expect(byTestId('capture')).toBeTruthy())
    fireEvent.change(byTestId('option-maxSide'), { target: { value: '100' } })
    fireEvent.click(byTestId('capture'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('最长边不能小于 160 像素')
  })
})
