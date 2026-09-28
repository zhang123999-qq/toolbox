// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['hue'], { type: 'image/png' })),
  downloadBlob: vi.fn(),
  drawWithFilter: vi.fn(() => ({ width: 800, height: 600 })),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

// 位置：本文件顶部（lib/image mock 之后）。
// 原因：hue.* 键尚未并入 i18n/messages.*，真实 useTranslate 对缺失 key 返回 undefined、
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

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawWithFilter.mockImplementation(() => ({ width: 800, height: 600 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/png' }))
})

describe('hue 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-hue')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
  })

  it('页面注明 ctx.filter 浏览器支持', () => {
    render(<Tool />)
    expect(screen.getByText(/Safari 18/)).toBeTruthy()
  })

  it('上传合法图片后显示结果与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 默认 hue=0，滤镜为 none（输出与原图一致）
    expect(mockDrawWithFilter.mock.calls[0][5]).toBe('none')
    expect(screen.getByTestId('stats').textContent).toContain('800×600')
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('色相超范围时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 181 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-hue'), { target: { value: '181' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('超出范围'))
  })

  it('非零色相透过滤镜字符串', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-hue'), { target: { value: '90' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const last = mockDrawWithFilter.mock.calls[mockDrawWithFilter.mock.calls.length - 1]
    expect(last[5]).toBe('hue-rotate(90deg)')
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 })
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('上传时显示处理中状态', async () => {
    let resolveLoad!: (img: HTMLImageElement) => void
    mockLoadImage.mockImplementationOnce(
      () =>
        new Promise<HTMLImageElement>((resolve) => {
          resolveLoad = resolve
        }),
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile()] } })
    })
    // 图片加载仍挂起，处理中指示应可见
    expect(screen.getByTestId('processing')).toBeTruthy()
    await act(async () => {
      resolveLoad({ width: 800, height: 600 } as never)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    const last = mockCanvasToBlob.mock.calls[mockCanvasToBlob.mock.calls.length - 1]
    expect(last[1]).toBe('image/jpeg')
  })

  it('色相选项变更触发重新处理并透过滤镜', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-hue'), { target: { value: '-45' } })
    })
    await waitFor(() => {
      const last = mockDrawWithFilter.mock.calls[mockDrawWithFilter.mock.calls.length - 1]
      expect(last[5]).toBe('hue-rotate(-45deg)')
    })
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-hue\.png$/)
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
