// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['png-bytes'], { type: 'image/png' })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 640, height: 480 })),
}))

import { canvasToBlob, downloadBlob, drawScaled } from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockDrawScaled = vi.mocked(drawScaled)

afterEach(() => {
  cleanup()
})

interface FakeTrack {
  stop: Mock
}

interface FakeStream {
  stream: MediaStream
  tracks: FakeTrack[]
}

const createdStreams: FakeStream[] = []

function makeStream(): FakeStream {
  const tracks: FakeTrack[] = [{ stop: vi.fn() }, { stop: vi.fn() }]
  const stream = {
    getTracks: () => tracks.map((t) => ({ stop: t.stop })),
    // 测试用：直接拿到 stop mock
    __tracks: tracks,
  } as unknown as MediaStream
  return { stream, tracks }
}

let mockGetUserMedia: Mock

function setMediaDevices(getUserMedia: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', {
    value: getUserMedia === undefined ? undefined : { getUserMedia },
    configurable: true,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  createdStreams.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockGetUserMedia = vi.fn(async () => {
    const s = makeStream()
    createdStreams.push(s)
    return s.stream
  })
  setMediaDevices(mockGetUserMedia)
})

/** 打开相机并等待预览出现 */
async function openCamera() {
  fireEvent.click(screen.getByTestId('open'))
  await waitFor(() => expect(screen.getByTestId('preview-video')).toBeTruthy())
}

/** 把预览 video 设为「可截取」状态（readyState ≥ 2） */
function makeVideoReady() {
  const video = screen.getByTestId('preview-video') as HTMLVideoElement
  Object.defineProperty(video, 'readyState', { value: 2, configurable: true })
  Object.defineProperty(video, 'videoWidth', { value: 640, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: 480, configurable: true })
}

describe('camera-snapshot 组件', () => {
  it('渲染打开按钮与选项，相机未打开时无预览/结果/下载', () => {
    render(<Tool />)
    expect(screen.getByTestId('open')).toBeTruthy()
    expect(screen.getByTestId('opt-facing')).toBeTruthy()
    expect(screen.getByTestId('opt-mirror')).toBeTruthy()
    expect(screen.queryByTestId('preview-video')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
  })

  it('打开相机时显示处理中，成功后显示预览', async () => {
    let resolveGum!: (s: MediaStream) => void
    mockGetUserMedia.mockImplementationOnce(
      () =>
        new Promise<MediaStream>((resolve) => {
          resolveGum = resolve
        }),
    )
    render(<Tool />)
    fireEvent.click(screen.getByTestId('open'))
    // getUserMedia 尚未 resolve：处理中提示可见
    expect(screen.getByTestId('processing')).toBeTruthy()
    await act(async () => {
      const s = makeStream()
      createdStreams.push(s)
      resolveGum(s.stream)
    })
    await waitFor(() => expect(screen.getByTestId('preview-video')).toBeTruthy())
    expect(mockGetUserMedia).toHaveBeenCalledWith({
      video: { facingMode: 'user' },
      audio: false,
    })
    // 打开后按钮切换为拍照/关闭
    expect(screen.getByTestId('snap')).toBeTruthy()
    expect(screen.getByTestId('close')).toBeTruthy()
    expect(screen.queryByTestId('open')).toBeNull()
  })

  it('不支持 getUserMedia 时显示明确错误', async () => {
    setMediaDevices(undefined)
    render(<Tool />)
    fireEvent.click(screen.getByTestId('open'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('preview-video')).toBeNull()
    expect(mockGetUserMedia).not.toHaveBeenCalled()
  })

  it('拒绝权限（NotAllowedError）显示友好提示', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    render(<Tool />)
    fireEvent.click(screen.getByTestId('open'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('preview-video')).toBeNull()
  })

  it('无摄像头（NotFoundError）显示提示', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new DOMException('no device', 'NotFoundError'))
    render(<Tool />)
    fireEvent.click(screen.getByTestId('open'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('不支持后置（OverconstrainedError）提示切换前置', async () => {
    mockGetUserMedia.mockRejectedValueOnce(new DOMException('constraint', 'OverconstrainedError'))
    render(<Tool />)
    fireEvent.click(screen.getByTestId('open'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('打开→拍照→下载完整流程', async () => {
    render(<Tool />)
    await openCamera()
    makeVideoReady()
    fireEvent.click(screen.getByTestId('snap'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockDrawScaled).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 下载按钮仅 result 非空渲染
    expect(screen.getByTestId('download')).toBeTruthy()
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toMatch(/^snapshot-\d{8}-\d{6}\.png$/)
  })

  it('视频未就绪（readyState < 2）时提示等待，不截取', async () => {
    render(<Tool />)
    await openCamera()
    // jsdom 中 video.readyState 默认为 0，不设为 ready
    fireEvent.click(screen.getByTestId('snap'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockDrawScaled).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('拍照导出失败显示错误', async () => {
    mockCanvasToBlob.mockRejectedValueOnce(new Error('encode fail'))
    render(<Tool />)
    await openCamera()
    makeVideoReady()
    fireEvent.click(screen.getByTestId('snap'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('切换摄像头时先释放旧流再请求新流', async () => {
    render(<Tool />)
    await openCamera()
    const first = createdStreams[0]
    expect(mockGetUserMedia).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByTestId('opt-facing'), { target: { value: 'environment' } })
    await waitFor(() => expect(mockGetUserMedia).toHaveBeenCalledTimes(2))
    // 旧流全部 track 已停止
    for (const t of first.tracks) {
      expect(t.stop).toHaveBeenCalledTimes(1)
    }
    expect(mockGetUserMedia.mock.calls[1][0]).toEqual({
      video: { facingMode: 'environment' },
      audio: false,
    })
    // 新流预览仍在
    expect(screen.getByTestId('preview-video')).toBeTruthy()
  })

  it('未打开相机时切换选项不请求流', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-facing'), { target: { value: 'environment' } })
    expect(mockGetUserMedia).not.toHaveBeenCalled()
  })

  it('关闭相机释放全部 track 并回到初始态', async () => {
    render(<Tool />)
    await openCamera()
    const first = createdStreams[0]
    fireEvent.click(screen.getByTestId('close'))
    for (const t of first.tracks) {
      expect(t.stop).toHaveBeenCalledTimes(1)
    }
    expect(screen.queryByTestId('preview-video')).toBeNull()
    expect(screen.getByTestId('open')).toBeTruthy()
  })

  it('组件卸载时释放摄像头', async () => {
    const { unmount } = render(<Tool />)
    await openCamera()
    const first = createdStreams[0]
    unmount()
    for (const t of first.tracks) {
      expect(t.stop).toHaveBeenCalledTimes(1)
    }
  })

  it('镜像选项切换预览翻转样式', async () => {
    render(<Tool />)
    await openCamera()
    const video = screen.getByTestId('preview-video') as HTMLVideoElement
    // 默认镜像开
    expect(video.style.transform).toBe('scaleX(-1)')
    fireEvent.change(screen.getByTestId('opt-mirror'), { target: { value: 'off' } })
    expect(video.style.transform).toBe('')
  })
})
