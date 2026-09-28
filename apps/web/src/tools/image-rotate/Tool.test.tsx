// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

// jsdom 的 canvas.getContext 不可用：只 mock 用到的 lib/image 函数，
// createCanvas 返回可断言的假 canvas + 假 2d 上下文。
const { mockCtx, mockGetContext } = vi.hoisted(() => {
  const mockCtx = {
    fillStyle: '',
    fillRect: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  }
  const mockGetContext = vi.fn(
    (): CanvasRenderingContext2D | null => mockCtx as unknown as CanvasRenderingContext2D,
  )
  return { mockCtx, mockGetContext }
})

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['rotated'], { type: 'image/png' })),
  createCanvas: vi.fn((w: number, h: number) => ({
    width: w,
    height: h,
    getContext: mockGetContext,
  })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
const mockDownloadBlob = vi.mocked(downloadBlob)
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

function angleInput() {
  return screen.getByTestId('opt-angle') as HTMLInputElement
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockGetContext.mockImplementation(() => mockCtx as unknown as CanvasRenderingContext2D)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/png' }))
})

describe('image-rotate 组件', () => {
  it('渲染投放区、快捷按钮与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('btn-rot90')).toBeTruthy()
    expect(screen.getByTestId('btn-rot180')).toBeTruthy()
    expect(screen.getByTestId('btn-rot270')).toBeTruthy()
    expect(screen.getByTestId('opt-angle')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.getByTestId('opt-bgcolor')).toBeTruthy()
    // 默认 jpeg：透明背景选项不出现
    expect(screen.queryByTestId('opt-transparent')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('上传合法图片后显示结果与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 默认角度 0°：画布与原图同尺寸
    expect(mockCreateCanvas).toHaveBeenCalledWith(800, 600)
    // 直角旋转无需背景填充
    expect(mockCtx.fillRect).not.toHaveBeenCalled()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('非法角度报错', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用超范围数字触发
      fireEvent.change(angleInput(), { target: { value: '400' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('角度超出范围')
  })

  it('质量非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
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

  it('Canvas 上下文不可用时报错', async () => {
    mockGetContext.mockReturnValueOnce(null)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用')
  })

  it('快捷旋转可连续点击累加', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-rot90'))
    })
    expect(angleInput().value).toBe('90')
    // 800x600 旋转 90°：画布 600x800
    expect(mockCreateCanvas).toHaveBeenLastCalledWith(600, 800)
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-rot90'))
    })
    expect(angleInput().value).toBe('180')
    expect(mockCreateCanvas).toHaveBeenLastCalledWith(800, 600)
  })

  it('快捷旋转在任意角度上累加并归一化', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(angleInput(), { target: { value: '300' } })
    })
    fireEvent.click(screen.getByTestId('btn-rot90'))
    expect(angleInput().value).toBe('30')
    fireEvent.click(screen.getByTestId('btn-rot270'))
    expect(angleInput().value).toBe('300')
  })

  it('角度输入非法时快捷旋转从 0 起算', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(angleInput(), { target: { value: '400' } })
    })
    fireEvent.click(screen.getByTestId('btn-rot90'))
    expect(angleInput().value).toBe('90')
  })

  it('非直角旋转填充背景色', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(angleInput(), { target: { value: '45' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 800x600 旋转 45°：画布扩大为 990x990
    expect(mockCreateCanvas).toHaveBeenLastCalledWith(990, 990)
    expect(mockCtx.fillStyle).toBe('#ffffff')
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 990, 990)
    expect(mockCtx.rotate).toHaveBeenCalledWith(Math.PI / 4)
    expect(mockCtx.translate).toHaveBeenCalledWith(495, 495)
    expect(mockCtx.drawImage).toHaveBeenCalled()
  })

  it('PNG + 透明背景时不填充', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    expect(screen.getByTestId('opt-transparent')).toBeTruthy()
    fireEvent.click(screen.getByTestId('opt-transparent'))
    await act(async () => {
      fireEvent.change(angleInput(), { target: { value: '45' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCtx.fillRect).not.toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalledWith(expect.anything(), 'image/png', undefined)
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(angleInput(), { target: { value: '45' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('背景色变更后重新处理并用于填充', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(angleInput(), { target: { value: '45' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-bgcolor'), { target: { value: '#ff0000' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    expect(mockCtx.fillStyle).toBe('#ff0000')
  })

  it('无文件时选项变更不处理', () => {
    render(<Tool />)
    fireEvent.change(angleInput(), { target: { value: '45' } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-rotated\.jpg$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('出错后仍保留重置入口（previewUrl 分支）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.getByTestId('reset')).toBeTruthy()
  })

  it('处理中显示提示', async () => {
    mockLoadImage.mockImplementation(() => new Promise<never>(() => {}))
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } })
    })
    expect(screen.getByTestId('processing')).toBeTruthy()
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
