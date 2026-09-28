// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['pngdata'], { type: 'image/png' })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 16, height: 16 })),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
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
  mockDrawScaled.mockImplementation(() => ({ width: 16, height: 16 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['pngdata'], { type: 'image/png' }))
})

describe('ico 组件', () => {
  it('渲染投放区与七档尺寸复选框，默认勾选 16/32/48', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    for (const s of [16, 24, 32, 48, 64, 128, 256]) {
      expect(screen.getByTestId(`opt-size-${s}`)).toBeTruthy()
    }
    expect((screen.getByTestId('opt-size-16') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('opt-size-32') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('opt-size-48') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('opt-size-24') as HTMLInputElement).checked).toBe(false)
  })

  it('上传合法图片后生成 ICO 并显示结果与预览', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('preview')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    // 默认 3 个尺寸 → 每个尺寸一次缩放 + 一次 PNG 导出
    expect(mockDrawScaled).toHaveBeenCalledTimes(3)
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(3)
    expect(mockDrawScaled).toHaveBeenCalledWith(expect.anything(), 800, 600, 48, 48)
    // 预览为最大选中尺寸
    expect(screen.getByTestId('preview-caption').textContent).toContain('48')
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('尺寸增减后重新生成', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 勾选 24：3 → 4 个尺寸
    fireEvent.click(screen.getByTestId('opt-size-24'))
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBe(7))
    // 取消 16：4 → 3 个尺寸
    fireEvent.click(screen.getByTestId('opt-size-16'))
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBe(10))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('全不选时报错且不生成', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 逐个取消：16（剩 32/48）→ 32（剩 48），每次等重生成完成避免竞态
    fireEvent.click(screen.getByTestId('opt-size-16'))
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBe(5))
    fireEvent.click(screen.getByTestId('opt-size-32'))
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBe(6))
    // 取消最后一个：直接报错，不再调用生成
    fireEvent.click(screen.getByTestId('opt-size-48'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('至少选择一个尺寸')
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockDrawScaled.mock.calls.length).toBe(6)
  })

  it('无文件时切换尺寸不触发重新生成', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('opt-size-24'))
    })
    expect((screen.getByTestId('opt-size-24') as HTMLInputElement).checked).toBe(true)
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('下载按钮调用 downloadBlob 且文件名为 .ico、类型为 image/x-icon', async () => {
    render(<Tool />)
    await upload(makeFile('photo.png'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('photo.ico')
    expect((blob as Blob).type).toBe('image/x-icon')
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
    // 空 dataTransfer 不处理
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: {} })
    })
    expect(mockLoadImage).not.toHaveBeenCalled()
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
