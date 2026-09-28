// @vitest-environment jsdom
/**
 * screen-recorder 组件测试
 *
 * getDisplayMedia / MediaRecorder 一律 mock，不做真实录制。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

let getDisplayMediaImpl: (() => Promise<unknown>) | null = null
let mediaRecorderImpl: (new (stream: unknown, options?: { mimeType?: string }) => unknown) | null =
  null

class MockMediaRecorder {
  static isTypeSupported = (mime: string): boolean => mime === 'video/webm'
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  constructor(
    public stream: unknown,
    public options?: { mimeType?: string },
  ) {}
  start(): void {
    this.ondataavailable?.({ data: new Blob(['chunk1']) })
    this.ondataavailable?.({ data: new Blob(['chunk2']) })
  }
  stop(): void {
    this.onstop?.()
  }
}

const fakeStream = { getTracks: () => [{ stop: vi.fn() }] }

function stubBrowserApis(): void {
  getDisplayMediaImpl = async () => fakeStream
  mediaRecorderImpl = MockMediaRecorder as unknown as new (
    stream: unknown,
    options?: { mimeType?: string },
  ) => unknown
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getDisplayMedia: () => getDisplayMediaImpl!(),
    },
  })
  vi.stubGlobal('MediaRecorder', mediaRecorderImpl)
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

describe('screen-recorder · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    const { container } = render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('start-record')).toBeTruthy()
    // boolean 选项由模板渲染为无 testid 的 checkbox，用选择器定位
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
  })

  it('开始录制 → 显示录制中与计时；停止 → 播放器与下载出现', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-record'))
    await waitFor(() => expect(byTestId('stop-record')).toBeTruthy())
    expect(byTestId('elapsed').textContent).toContain('录制中')
    fireEvent.click(byTestId('stop-record'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('录制完成')
    const link = byTestId('download-video') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toMatch(/^屏幕录制-.*\.webm$/)
  })

  it('丢弃后回到初始态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-record'))
    await waitFor(() => expect(byTestId('stop-record')).toBeTruthy())
    fireEvent.click(byTestId('stop-record'))
    await waitFor(() => expect(byTestId('discard')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('discard'))
    expect(byTestId('start-record')).toBeTruthy()
    expect(screen.queryByTestId('player')).toBeNull()
  })

  it('getDisplayMedia 缺失 → 中文提示换浏览器', async () => {
    vi.stubGlobal('navigator', { mediaDevices: {} })
    render(<Tool />)
    fireEvent.click(byTestId('start-record'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('不支持屏幕录制')
  })

  it('MediaRecorder 缺失 → 中文提示换浏览器', async () => {
    vi.stubGlobal('MediaRecorder', undefined)
    render(<Tool />)
    fireEvent.click(byTestId('start-record'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('不支持视频录制')
  })

  it('用户取消共享（NotAllowedError）→ 中文提示已取消', async () => {
    getDisplayMediaImpl = async () => {
      throw new DOMException('Permission denied', 'NotAllowedError')
    }
    render(<Tool />)
    fireEvent.click(byTestId('start-record'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('已取消屏幕共享')
  })
})
