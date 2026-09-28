// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import { downloadBlob } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)

/** 全局 MediaRecorder mock：静态 isTypeSupported + 实例 start/stop/state + 可手动触发的回调 */
class MockMediaRecorder {
  static instances: MockMediaRecorder[] = []
  static isTypeSupported = vi.fn((_mime: string) => true)
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  state = 'inactive'
  stream: unknown
  mimeType: string
  constructor(stream: unknown, options: { mimeType: string }) {
    this.stream = stream
    this.mimeType = options.mimeType
    MockMediaRecorder.instances.push(this)
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    if (this.onstop) this.onstop()
  }
  emitData(data: Blob) {
    if (this.ondataavailable) this.ondataavailable({ data })
  }
}

const mockGetDisplayMedia = vi.fn()

interface FakeTrack {
  stop: () => void
  onended: (() => void) | null
  kind: string
}
interface FakeStream {
  stream: MediaStream
  videoTrack: FakeTrack
  trackStop: ReturnType<typeof vi.fn>
}

let lastStream: FakeStream | null = null

function makeStream(): FakeStream {
  const trackStop = vi.fn()
  const videoTrack: FakeTrack = { stop: trackStop, onended: null, kind: 'video' }
  const audioTrack: FakeTrack = { stop: trackStop, onended: null, kind: 'audio' }
  const stream = {
    getTracks: () => [videoTrack, audioTrack],
    getVideoTracks: () => [videoTrack],
  } as unknown as MediaStream
  return { stream, videoTrack, trackStop }
}

/** 正常浏览器环境：MediaRecorder 与 getDisplayMedia 均可用 */
function setupBrowser() {
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getDisplayMedia: mockGetDisplayMedia },
    configurable: true,
  })
}

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true })
}

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('start'))
  })
}

function lastRecorder(): MockMediaRecorder {
  const rec = MockMediaRecorder.instances[MockMediaRecorder.instances.length - 1]
  if (!rec) throw new Error('测试前置失败：没有创建 MediaRecorder 实例')
  return rec
}

beforeEach(() => {
  vi.clearAllMocks()
  MockMediaRecorder.instances = []
  MockMediaRecorder.isTypeSupported.mockImplementation(() => true)
  mockGetDisplayMedia.mockImplementation(async () => {
    lastStream = makeStream()
    return lastStream.stream
  })
  lastStream = null
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  setupBrowser()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('screen-record 组件', () => {
  it('渲染开始按钮与选项，初始无计时器/结果/下载按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('start')).toBeTruthy()
    expect(screen.getByTestId('opt-codec')).toBeTruthy()
    expect(screen.getByTestId('opt-audio')).toBeTruthy()
    expect(screen.queryByTestId('timer')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('MediaRecorder 缺失时报错', async () => {
    vi.unstubAllGlobals() // jsdom 本就没有 MediaRecorder，删桩后 typeof 为 undefined
    render(<Tool />)
    await clickStart()
    const err = screen.getByTestId('error')
    expect(err.getAttribute('role')).toBe('alert')
    expect(mockGetDisplayMedia).not.toHaveBeenCalled()
  })

  it('getDisplayMedia 缺失时报错', async () => {
    setMediaDevices({})
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(MockMediaRecorder.instances.length).toBe(0)
  })

  it('mediaDevices 完全缺失时报错', async () => {
    setMediaDevices(undefined)
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error')).toBeTruthy()
  })

  it('用户拒绝权限（NotAllowedError）给出友好提示', async () => {
    mockGetDisplayMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error').textContent).toContain('拒绝')
    expect(screen.queryByTestId('stop')).toBeNull()
  })

  it('无可用 mimeType 时报错并停止已采集的轨道', async () => {
    MockMediaRecorder.isTypeSupported.mockImplementation(() => false)
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(MockMediaRecorder.instances.length).toBe(0)
    expect(lastStream?.trackStop).toHaveBeenCalled()
  })

  it('完整录制流程：start → data → stop → 下载', async () => {
    render(<Tool />)
    await clickStart()

    expect(screen.getByTestId('stop')).toBeTruthy()
    expect(screen.getByTestId('timer').textContent).toBe('00:00')
    expect(screen.getByTestId('preview-video')).toBeTruthy()
    expect(mockGetDisplayMedia).toHaveBeenCalledWith({ video: true, audio: true })
    const rec = lastRecorder()
    expect(rec.mimeType).toBe('video/webm;codecs=vp9')
    expect(rec.state).toBe('recording')

    // 推送一块有效数据和一块空数据（空块应被丢弃）
    await act(async () => {
      rec.emitData(new Blob(['chunk1'], { type: 'video/webm' }))
      rec.emitData(new Blob([], { type: 'video/webm' }))
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('stop'))
    })

    expect(screen.getByTestId('result')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.queryByTestId('timer')).toBeNull()
    expect(lastStream?.trackStop).toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toMatch(/^screen-record-\d{8}-\d{6}\.webm$/)
  })

  it('录制中计时器每秒更新', async () => {
    vi.useFakeTimers()
    try {
      render(<Tool />)
      await clickStart()
      expect(screen.getByTestId('timer').textContent).toBe('00:00')
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      expect(screen.getByTestId('timer').textContent).toBe('00:03')
      act(() => {
        vi.advanceTimersByTime(57000)
      })
      expect(screen.getByTestId('timer').textContent).toBe('01:00')
    } finally {
      vi.useRealTimers()
    }
  })

  it('编码偏好 vp8 透传给 MediaRecorder', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-codec'), { target: { value: 'vp8' } })
    await clickStart()
    expect(lastRecorder().mimeType).toBe('video/webm;codecs=vp8')
  })

  it('关闭系统音频时 getDisplayMedia 不请求音频', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-audio'), { target: { value: 'off' } })
    await clickStart()
    expect(mockGetDisplayMedia).toHaveBeenCalledWith({ video: true, audio: false })
  })

  it('recorder 非 recording 状态时停止按钮不重复调用 stop', async () => {
    render(<Tool />)
    await clickStart()
    const rec = lastRecorder()
    const stopSpy = vi.spyOn(rec, 'stop')
    rec.state = 'inactive' // 模拟异常状态
    await act(async () => {
      fireEvent.click(screen.getByTestId('stop'))
    })
    expect(stopSpy).not.toHaveBeenCalled()
    // 轨道仍被统一收尾停掉
    expect(lastStream?.trackStop).toHaveBeenCalled()
  })

  it('浏览器原生"停止共享"（track.onended）触发统一收尾', async () => {
    render(<Tool />)
    await clickStart()
    const rec = lastRecorder()
    const stopSpy = vi.spyOn(rec, 'stop')
    await act(async () => {
      lastStream?.videoTrack.onended?.()
    })
    expect(stopSpy).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('result')).toBeTruthy()
    expect(lastStream?.trackStop).toHaveBeenCalled()
  })

  it('录制中卸载：recorder.stop、track.stop、clearInterval 都被调用', async () => {
    vi.useFakeTimers()
    try {
      const clearSpy = vi.spyOn(globalThis, 'clearInterval')
      const { unmount } = render(<Tool />)
      await clickStart()
      const rec = lastRecorder()
      const stopSpy = vi.spyOn(rec, 'stop')
      unmount()
      expect(stopSpy).toHaveBeenCalledTimes(1)
      expect(lastStream?.trackStop).toHaveBeenCalled()
      expect(clearSpy).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('空闲卸载不抛错', () => {
    const { unmount } = render(<Tool />)
    expect(() => unmount()).not.toThrow()
  })
})
