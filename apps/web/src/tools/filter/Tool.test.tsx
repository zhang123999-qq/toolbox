// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['filtered'], { type: 'image/png' })),
  downloadBlob: vi.fn(),
  drawWithFilter: vi.fn(() => ({ width: 800, height: 600 })),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

import {
  canvasToBlob,
  downloadBlob,
  drawWithFilter,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockDrawWithFilter = vi.mocked(drawWithFilter)
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

function lastDrawFilter(): string {
  const calls = mockDrawWithFilter.mock.calls
  return calls[calls.length - 1][5]
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawWithFilter.mockImplementation((() => ({ width: 800, height: 600 })) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/png' }))
})

describe('filter 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-preset')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
  })

  it('预设下拉列出 8 种滤镜', () => {
    render(<Tool />)
    const select = screen.getByTestId('opt-preset') as HTMLSelectElement
    expect(select.options.length).toBe(8)
    expect(select.value).toBe('none')
    expect(select.options[0].textContent).toBe('原图')
    expect(select.options[7].textContent).toBe('鲜明')
  })

  it('上传合法图片后显示结果与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('stats').textContent).toContain('800×600')
    expect(screen.getByTestId('stats').textContent).toContain('原图')
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockDrawWithFilter).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('上传时按所选预设的 filter 字符串绘制', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-preset'), { target: { value: 'sepia' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(lastDrawFilter()).toBe('sepia(0.9)')
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的文件类型')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('big.png', 'image/png', MAX_FILE_SIZE + 1))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('预设变更后按新滤镜重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockDrawWithFilter.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-preset'), { target: { value: 'grayscale' } })
    await waitFor(() => expect(mockDrawWithFilter.mock.calls.length).toBeGreaterThan(calls))
    expect(lastDrawFilter()).toBe('grayscale(1)')
  })

  it('格式变更触发重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('下载按钮调用 downloadBlob 且文件名带 -filter 后缀', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-filter\.png$/)
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
