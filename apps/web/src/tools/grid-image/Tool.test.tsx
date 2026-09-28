// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['tile'], { type: 'image/jpeg' })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 900, height: 900 })),
}))

import {
  canvasToBlob,
  downloadBlob,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

const mockImg = { width: 900, height: 900 }
const mockDrawImage = vi.fn()
const mockCtx = { drawImage: mockDrawImage } as unknown as CanvasRenderingContext2D
let getContextSpy: ReturnType<typeof vi.spyOn>

afterEach(() => {
  cleanup()
  getContextSpy.mockRestore()
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
  mockLoadImage.mockImplementation(async () => mockImg as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['tile'], { type: 'image/jpeg' }))
  mockDrawImage.mockClear()
  getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
})

describe('grid-image 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-rows')).toBeTruthy()
    expect(screen.getByTestId('opt-cols')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
  })

  it('上传合法图片后切出 3×3=9 个 tile，每块有独立下载按钮', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const buttons = screen.getAllByTestId(/^download-tile-/)
    expect(buttons).toHaveLength(9)
    expect(screen.getByTestId('tile-1-1')).toBeTruthy()
    expect(screen.getByTestId('tile-3-3')).toBeTruthy()
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(9)
    // 默认 jpeg + 质量 90 → mime 与 0.9 质量
    expect(mockCanvasToBlob.mock.calls[0][1]).toBe('image/jpeg')
    expect(mockCanvasToBlob.mock.calls[0][2]).toBe(0.9)
    // 900×900 切 3×3：每块 300×300，第一块 drawImage 参数正确
    expect(mockDrawImage).toHaveBeenCalledWith(mockImg, 0, 0, 300, 300, 0, 0, 300, 300)
    expect(screen.getByTestId('tile-grid').getAttribute('style')).toContain('repeat(3, 1fr)')
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    const file = makeFile('big.png', 'image/png', 1024)
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('行数超范围（99）时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-rows'), { target: { value: '99' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('行数超出范围'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('行列数变更后重新切分（2×3=6 块）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getAllByTestId(/^download-tile-/)).toHaveLength(9)
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-rows'), { target: { value: '2' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    await waitFor(() => expect(screen.getAllByTestId(/^download-tile-/)).toHaveLength(6))
    expect(screen.queryByTestId('tile-3-1')).toBeNull()
    expect(screen.getByTestId('tile-grid').getAttribute('style')).toContain('repeat(3, 1fr)')
  })

  it('格式变更触发重新切分，png 不传质量参数', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    mockCanvasToBlob.mockClear()
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    await waitFor(() => expect(mockCanvasToBlob).toHaveBeenCalled())
    for (const call of mockCanvasToBlob.mock.calls) {
      expect(call[1]).toBe('image/png')
      expect(call[2]).toBeUndefined()
    }
  })

  it('质量变更触发重新切分并透传质量参数', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    mockCanvasToBlob.mockClear()
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '70' } })
    })
    await waitFor(() => expect(mockCanvasToBlob).toHaveBeenCalled())
    for (const call of mockCanvasToBlob.mock.calls) {
      expect(call[2]).toBe(0.7)
    }
  })

  it('下载按钮调用 downloadBlob 并传正确文件名', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-tile-1-1'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toBe('photo-r1c1.jpg')
    fireEvent.click(screen.getByTestId('download-tile-3-2'))
    expect(mockDownloadBlob.mock.calls[1][1]).toBe('photo-r3c2.jpg')
  })

  it('重置清空状态并释放 tile URL', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    // 9 个 tile 的 object URL 全部释放
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(9)
  })

  it('重新切分时释放上一轮的 tile URL', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-cols'), { target: { value: '2' } })
    })
    await waitFor(() => expect(screen.getAllByTestId(/^download-tile-/)).toHaveLength(6))
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(9)
  })

  it('卸载时释放 tile URL', async () => {
    const { unmount } = render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(9)
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

  it('无文件时改选项不重新处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })
})
