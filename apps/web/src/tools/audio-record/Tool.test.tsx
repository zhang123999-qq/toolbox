// @vitest-environment jsdom
/**
 * audio-record 组件测试
 *
 * MediaRecorder / getUserMedia 在 jsdom 里不存在：
 * - 不支持分支：直接卸掉全局 MediaRecorder / mediaDevices，断言中文错误；
 * - 成功路径：注入 MockMediaRecorder 与假的 getUserMedia。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 最小 MediaRecorder 形状：Tool 只用 isTypeSupported / 构造 / start / pause / resume / stop / mimeType / ondataavailable / onstop */
class MockMediaRecorder {
  static isTypeSupported(mime: string): boolean {
    return mime === 'audio/webm;codecs=opus'
  }
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  readonly mimeType: string
  constructor(_stream: unknown, options?: { mimeType?: string }) {
    this.mimeType = options?.mimeType ?? 'audio/webm'
  }
  start(): void {}
  pause(): void {}
  resume(): void {}
  stop(): void {
    this.ondataavailable?.({ data: new Blob(['fake-audio-data'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

const fakeStream = { getTracks: (): MediaStreamTrack[] => [] }

function stubBrowserApis(): void {
  vi.stubGlobal('MediaRecorder', MockMediaRecorder as unknown as typeof MediaRecorder)
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: { getUserMedia: async (): Promise<unknown> => fakeStream },
    configurable: true,
  })
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

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('audio-record · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('初始状态为待机，显示开始录音按钮与计时 00:00', () => {
    render(<Tool />)
    expect(byTestId('record-status').textContent).toContain('待机')
    expect(byTestId('record-elapsed').textContent).toBe('00:00')
    expect(byTestId('record-start')).toBeTruthy()
  })

  it('开始 → 暂停 → 继续 → 停止完整流程，停止后出现播放器', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('record-start'))
    await waitFor(() => expect(byTestId('record-status').textContent).toContain('录音中'), {
      timeout: 10000,
    })
    expect(byTestId('record-pause')).toBeTruthy()

    fireEvent.click(byTestId('record-pause'))
    expect(byTestId('record-status').textContent).toContain('已暂停')
    expect(byTestId('record-resume')).toBeTruthy()

    fireEvent.click(byTestId('record-resume'))
    expect(byTestId('record-status').textContent).toContain('录音中')

    fireEvent.click(byTestId('record-stop'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('record-status').textContent).toContain('已停止')
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('录音时长')
    const link = byTestId('download-audio') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toMatch(/recording-.*\.webm$/)
  })

  it('停止后可重置回待机', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('record-start'))
    await waitFor(() => expect(byTestId('record-status').textContent).toContain('录音中'), {
      timeout: 10000,
    })
    fireEvent.click(byTestId('record-stop'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('record-reset'))
    expect(byTestId('record-status').textContent).toContain('待机')
    expect(screen.queryByTestId('player')).toBeNull()
  })

  it('浏览器不支持 MediaRecorder → 中文错误提示', async () => {
    vi.stubGlobal('MediaRecorder', undefined)
    render(<Tool />)
    fireEvent.click(byTestId('record-start'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('不支持 MediaRecorder')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('浏览器不支持 getUserMedia → 中文错误提示', async () => {
    Object.defineProperty(window.navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    })
    render(<Tool />)
    fireEvent.click(byTestId('record-start'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('getUserMedia')
  })
})
