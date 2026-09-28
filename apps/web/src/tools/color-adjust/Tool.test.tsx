// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['adjusted'], { type: 'image/png' })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

/**
 * 当前 jsdom 未提供 ImageData 构造器，补一个最小实现（仅测试用）；
 * Tool.tsx 保持 `new ImageData(out, w, h)` 的写法不变。
 */
class FakeImageData {
  readonly data: Uint8ClampedArray
  readonly width: number
  readonly height: number
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data
    this.width = width
    this.height = height
  }
}

let mockCtx: {
  getImageData: ReturnType<typeof vi.fn>
  putImageData: ReturnType<typeof vi.fn>
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function makeFile(name = 'photo.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('ImageData', FakeImageData)
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockCtx = {
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(400 * 300 * 4),
      width: 400,
      height: 300,
    })),
    putImageData: vi.fn(),
  }
  mockDrawScaled.mockImplementation(
    () => ({ width: 400, height: 300, getContext: () => mockCtx }) as never,
  )
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/png' }))
})

describe('color-adjust 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-temperature')).toBeTruthy()
    expect(screen.getByTestId('opt-tint')).toBeTruthy()
    expect(screen.getByTestId('opt-exposure')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
  })

  it('上传合法图片后走像素管线并显示结果', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 400, 300)
    expect(mockCtx.putImageData).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    expect(screen.getByTestId('stats').textContent).toContain('400×300')
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('不支持的图片文件'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('色温非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 101 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-temperature'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('Canvas 2D 上下文不可用时显示错误（覆盖 throw 分支）', async () => {
    mockDrawScaled.mockImplementationOnce(
      () => ({ width: 400, height: 300, getContext: () => null }) as never,
    )
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('处理中显示处理状态', async () => {
    mockLoadImage.mockImplementationOnce(() => new Promise(() => {}) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-exposure'), { target: { value: '20' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('色调选项变更触发重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-tint'), { target: { value: '-10' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('格式变更触发重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-color-adjust\.png$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makeFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })
})
