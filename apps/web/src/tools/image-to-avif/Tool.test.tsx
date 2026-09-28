// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['compressed'], { type: 'image/avif' })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 400, height: 300 })),
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

/** 特性探测用的原生 canvas.toBlob：jsdom 未实现，按用例打桩 */
const toBlobMock = vi.fn()
Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
  value: toBlobMock,
  configurable: true,
  writable: true,
})

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
  mockDrawScaled.mockImplementation(() => ({ width: 400, height: 300 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/avif' }))
  // 默认：浏览器支持 AVIF 编码
  toBlobMock.mockImplementation((cb: (b: Blob | null) => void, type?: string) => {
    cb(type === 'image/avif' ? new Blob(['avif'], { type: 'image/avif' }) : null)
  })
})

describe('image-to-avif 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.getByTestId('opt-maxdim')).toBeTruthy()
  })

  it('上传合法图片后显示结果与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    // 以 AVIF MIME + 质量 0.8 导出
    expect(mockCanvasToBlob).toHaveBeenCalledWith(expect.anything(), 'image/avif', 0.8)
  })

  it('特性检测失败（toBlob 返回 null）显示明确错误且不执行转换', async () => {
    toBlobMock.mockImplementationOnce((cb: (b: Blob | null) => void) => cb(null))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('当前浏览器不支持 AVIF 编码'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
    // 特性检测在解码之前：不执行转换，不输出坏文件
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('特性检测抛错同样提示不支持', async () => {
    toBlobMock.mockImplementationOnce(() => {
      throw new Error('toBlob boom')
    })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('当前浏览器不支持 AVIF 编码'),
    )
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件过大显示错误', async () => {
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
  })

  it('质量非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 101 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('最大边非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-maxdim'), { target: { value: '16385' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('尺寸过大'))
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '60' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('下载按钮调用 downloadBlob 且文件名为 -avif.avif', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-avif\.avif$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
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
