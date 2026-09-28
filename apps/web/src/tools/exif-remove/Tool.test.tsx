// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['cleaned'], { type: 'image/jpeg' })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 800, height: 600 })),
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

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => ({ width: 800, height: 600 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/jpeg' }))
})

describe('exif-remove 组件', () => {
  it('渲染投放区与格式选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('上传合法图片后显示结果、对比与下载按钮', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('compare')).toBeTruthy()
    expect(screen.getByTestId('compare-orig')).toBeTruthy()
    expect(screen.getByTestId('compare-new')).toBeTruthy()
    expect(screen.getByTestId('compare-saved')).toBeTruthy()
    expect(screen.getByTestId('compare-dims')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
    // 按原尺寸绘制
    expect(mockDrawScaled).toHaveBeenCalled()
    const [, sw, sh, dw, dh] = mockDrawScaled.mock.calls[0]
    expect([sw, sh, dw, dh]).toEqual([800, 600, 800, 600])
    // JPEG 固定质量 0.92 导出
    expect(mockCanvasToBlob).toHaveBeenCalled()
    const [, mime, quality] = mockCanvasToBlob.mock.calls[0]
    expect(mime).toBe('image/jpeg')
    expect(quality).toBe(0.92)
  })

  it('上传非图片文件时拒绝处理（无结果、不解码）', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    // 拒绝发生在首个 await 之前，act 结束时处理已完成；
    // 错误文案走 i18n（键待合并），此处不断言其文本，只断言行为
    await waitFor(() => expect(screen.queryByTestId('processing')).toBeNull())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('超 50MB 文件显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('big.png', 'image/png', 50 * 1024 * 1024 + 1))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('导出失败显示错误', async () => {
    mockCanvasToBlob.mockRejectedValueOnce(new Error('导出失败：浏览器不支持 image/jpeg 编码'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('导出失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('格式选项变更后重新处理（png 无损导出）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    const last = mockCanvasToBlob.mock.calls[mockCanvasToBlob.mock.calls.length - 1]
    expect(last[1]).toBe('image/png')
    expect(last[2]).toBeUndefined()
  })

  it('无文件时选项变更不触发处理', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob 且文件名为 -noexif 后缀', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-noexif\.jpg$/)
  })

  it('png 格式下载文件名为 -noexif.png', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-noexif\.png$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
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
