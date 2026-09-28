// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  createCanvas: vi.fn(() => ({
    width: 1280,
    height: 720,
    getContext: vi.fn(() => ({ drawImage: vi.fn() })),
  })),
  downloadBlob: vi.fn(),
}))

import { canvasToBlob, createCanvas, downloadBlob } from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
const mockDownloadBlob = vi.mocked(downloadBlob)

const mockGetDisplayMedia = vi.fn()
const playMock = vi.fn().mockResolvedValue(undefined)

function makeStream() {
  const trackStop = vi.fn()
  const stream = { getTracks: () => [{ stop: trackStop }] }
  return { stream, trackStop }
}

let lastTrackStop: ReturnType<typeof vi.fn> | null = null

function setMediaDevices(value: unknown) {
  Object.defineProperty(navigator, 'mediaDevices', { value, configurable: true })
}

/** 设置预览 video 元素的就绪状态与尺寸（jsdom 中均为只读 getter，需 defineProperty） */
function setVideoState(readyState: number, width = 1280, height = 720) {
  const video = screen.getByTestId('preview-video')
  Object.defineProperty(video, 'readyState', { value: readyState, configurable: true })
  Object.defineProperty(video, 'videoWidth', { value: width, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: height, configurable: true })
}

async function clickStart() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('start'))
  })
}

/** 进入 preview 阶段：开始 → 授权通过 → video 就绪 */
async function startPreview(readyState = 2) {
  render(<Tool />)
  await clickStart()
  expect(screen.getByTestId('preview-video')).toBeTruthy()
  setVideoState(readyState)
}

beforeEach(() => {
  vi.clearAllMocks()
  lastTrackStop = null
  HTMLVideoElement.prototype.play = playMock
  mockGetDisplayMedia.mockImplementation(async () => {
    const { stream, trackStop } = makeStream()
    lastTrackStop = trackStop
    return stream
  })
  setMediaDevices({ getDisplayMedia: mockGetDisplayMedia })
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  cleanup()
})

describe('screen-capture 组件', () => {
  it('初始渲染：开始按钮可见，无预览/结果/错误/处理提示', () => {
    render(<Tool />)
    expect(screen.getByTestId('start')).toBeTruthy()
    expect(screen.queryByTestId('preview-video')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('mediaDevices 完全缺失时提示不支持，且不调用 getDisplayMedia', async () => {
    setMediaDevices(undefined)
    render(<Tool />)
    await clickStart()
    const err = screen.getByTestId('error')
    expect(err.getAttribute('role')).toBe('alert')
    expect(mockGetDisplayMedia).not.toHaveBeenCalled()
    expect(screen.queryByTestId('preview-video')).toBeNull()
  })

  it('mediaDevices 存在但无 getDisplayMedia 时提示不支持', async () => {
    setMediaDevices({})
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(mockGetDisplayMedia).not.toHaveBeenCalled()
  })

  it('用户拒绝授权（NotAllowedError）→ 错误提示并回到 idle', async () => {
    mockGetDisplayMedia.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error').getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('preview-video')).toBeNull()
    // 回到 idle：开始按钮重新可见
    expect(screen.getByTestId('start')).toBeTruthy()
  })

  it('无可共享目标（NotFoundError）→ 错误提示', async () => {
    mockGetDisplayMedia.mockRejectedValueOnce(new DOMException('none', 'NotFoundError'))
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(screen.getByTestId('start')).toBeTruthy()
  })

  it('其他 getDisplayMedia 错误 → 通用错误提示', async () => {
    mockGetDisplayMedia.mockRejectedValueOnce(new Error('boom'))
    render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(screen.getByTestId('start')).toBeTruthy()
  })

  it('授权通过后进入预览：video 挂载并绑定 stream、开始播放', async () => {
    await startPreview()
    const video = screen.getByTestId('preview-video')
    expect(mockGetDisplayMedia).toHaveBeenCalledWith({ video: true })
    // attachPreview 回调已把 stream 绑到 srcObject
    expect((video as HTMLVideoElement).srcObject).toBeTruthy()
    expect(playMock).toHaveBeenCalled()
    expect(screen.getByTestId('capture')).toBeTruthy()
    expect(screen.getByTestId('stop')).toBeTruthy()
  })

  it('请求权限时显示处理提示', async () => {
    let resolveStream!: (s: unknown) => void
    mockGetDisplayMedia.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveStream = res
        }),
    )
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('start'))
    })
    expect(screen.getByTestId('processing')).toBeTruthy()
    expect(screen.queryByTestId('preview-video')).toBeNull()
    await act(async () => {
      resolveStream(makeStream().stream)
    })
    expect(screen.getByTestId('preview-video')).toBeTruthy()
  })

  it('视频流未就绪（readyState < 2）时截取被拒绝并提示', async () => {
    await startPreview(1)
    await act(async () => {
      fireEvent.click(screen.getByTestId('capture'))
    })
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(screen.queryByTestId('result')).toBeNull()
    // 未截取成功，不释放共享
    expect(lastTrackStop).not.toHaveBeenCalled()
  })

  it('成功截取：出结果、自动下载、立即释放共享 tracks', async () => {
    await startPreview()
    await act(async () => {
      fireEvent.click(screen.getByTestId('capture'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('download')).toBeTruthy()
    // canvas 绘制与 PNG 导出
    expect(mockCreateCanvas).toHaveBeenCalledWith(1280, 720)
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 截取后立即自动下载一次
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toMatch(/^screen-capture-\d+\.png$/)
    // 共享已释放：所有 track.stop 被调用
    expect(lastTrackStop).toHaveBeenCalledTimes(1)
    // 回到可重新开始状态
    expect(screen.getByTestId('start')).toBeTruthy()
  })

  it('结果区下载按钮可再次下载', async () => {
    await startPreview()
    await act(async () => {
      fireEvent.click(screen.getByTestId('capture'))
    })
    await waitFor(() => expect(screen.getByTestId('download')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(2)
    const [, first] = mockDownloadBlob.mock.calls[0]
    const [, second] = mockDownloadBlob.mock.calls[1]
    expect(second).toBe(first)
  })

  it('截取中显示处理提示', async () => {
    await startPreview()
    let resolveBlob!: (b: Blob) => void
    mockCanvasToBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((res) => {
          resolveBlob = res
        }),
    )
    await act(async () => {
      fireEvent.click(screen.getByTestId('capture'))
    })
    expect(screen.getByTestId('processing')).toBeTruthy()
    await act(async () => {
      resolveBlob(new Blob(['x'], { type: 'image/png' }))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('canvas 2d 上下文不可用时仍完成截取', async () => {
    mockCreateCanvas.mockReturnValueOnce({
      width: 640,
      height: 480,
      getContext: () => null,
    } as unknown as HTMLCanvasElement)
    await startPreview()
    await act(async () => {
      fireEvent.click(screen.getByTestId('capture'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockDownloadBlob).toHaveBeenCalled()
  })

  it('PNG 导出失败时显示错误', async () => {
    mockCanvasToBlob.mockRejectedValueOnce(new Error('导出失败'))
    await startPreview()
    await act(async () => {
      fireEvent.click(screen.getByTestId('capture'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('预览中点击停止共享：释放 tracks 并回到 idle', async () => {
    await startPreview()
    fireEvent.click(screen.getByTestId('stop'))
    expect(lastTrackStop).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('start')).toBeTruthy()
    expect(screen.queryByTestId('preview-video')).toBeNull()
  })

  it('预览中卸载组件：所有 track.stop 被调用（指示灯不常亮）', async () => {
    const { unmount } = render(<Tool />)
    await clickStart()
    expect(screen.getByTestId('preview-video')).toBeTruthy()
    unmount()
    expect(lastTrackStop).toHaveBeenCalled()
  })

  it('空闲卸载不抛错', () => {
    const { unmount } = render(<Tool />)
    expect(() => unmount()).not.toThrow()
  })

  it('重新开始会先释放旧流', async () => {
    await startPreview()
    // 停止一次（释放），再开始：handleStart 内的 stopTracks 走空 stream 分支
    fireEvent.click(screen.getByTestId('stop'))
    await clickStart()
    expect(screen.getByTestId('preview-video')).toBeTruthy()
    expect(mockGetDisplayMedia).toHaveBeenCalledTimes(2)
  })
})
