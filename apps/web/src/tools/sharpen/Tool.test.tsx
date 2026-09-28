// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => {
  const mockCtx = {
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(400 * 300 * 4),
      width: 400,
      height: 300,
    })),
    putImageData: vi.fn(),
  }
  return {
    canvasToBlob: vi.fn(async () => new Blob(['sharpened'], { type: 'image/png' })),
    downloadBlob: vi.fn(),
    drawScaled: vi.fn(() => ({ width: 400, height: 300, getContext: () => mockCtx })),
    formatBytes: (n: number) => `${n} B`,
    isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
    loadImageFromBlob: vi.fn(async () => ({ width: 400, height: 300 })),
    readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
  }
})

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

// 本环境 jsdom 未提供 ImageData 构造器（与 brief 假设不同）：用最小实现补齐，
// 仅用于把卷积结果传给 putImageData；真实浏览器使用原生 ImageData。
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
vi.stubGlobal('ImageData', FakeImageData)

afterEach(() => {
  cleanup()
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

/** 取 drawScaled 返回的假 canvas 上的假 2d 上下文（断言 putImageData 用） */
function fakeCtx() {
  const canvas = mockDrawScaled.mock.results[0].value as unknown as {
    getContext: (kind: string) => { putImageData: (...args: unknown[]) => void }
  }
  return canvas.getContext('2d')
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 400, height: 300 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['s'], { type: 'image/png' }))
})

describe('sharpen 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-strength')).toBeTruthy()
  })

  it('上传合法图片后显示结果、统计并写回卷积像素', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats').textContent).toContain('50%')
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockDrawScaled).toHaveBeenCalled()
    // 卷积结果确实用 putImageData 写回了 canvas（400×300 与假 canvas 一致）
    const putImageData = fakeCtx().putImageData
    expect(putImageData).toHaveBeenCalledWith(
      expect.objectContaining({ width: 400, height: 300 }),
      0,
      0,
    )
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('强度非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 101 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-strength'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('强度超出范围')
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('Canvas 2D 上下文不可用时显示错误', async () => {
    mockDrawScaled.mockImplementationOnce(
      () => ({ width: 400, height: 300, getContext: () => null }) as never,
    )
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('强度选项变更触发重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-strength'), { target: { value: '80' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-sharpen\.png$/)
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
