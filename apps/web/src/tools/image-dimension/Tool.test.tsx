// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

interface CtxStub {
  drawImage: (...args: unknown[]) => void
  fillRect: (...args: unknown[]) => void
  fillStyle: string
}

vi.mock('../../lib/image', () => {
  const ctxStub = {
    fillStyle: '',
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'high',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  }
  const makeCanvas = (w: number, h: number) => ({
    width: w,
    height: h,
    getContext: () => ctxStub,
  })
  return {
    canvasToBlob: vi.fn(async () => new Blob(['c'], { type: 'image/jpeg' })),
    createCanvas: vi.fn((w: number, h: number) => makeCanvas(w, h)),
    downloadBlob: vi.fn(),
    drawScaled: vi.fn((_img: unknown, _sw: number, _sh: number, dw: number, dh: number) =>
      makeCanvas(dw, dh),
    ),
    formatBytes: (n: number) => `${n} B`,
    isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
    loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
    readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
  }
})

import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
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

/** 取最近一次 createCanvas 产出的 2d 上下文桩 */
function lastCtx(): CtxStub {
  const results = mockCreateCanvas.mock.results
  const canvas = results[results.length - 1].value as { getContext: () => CtxStub }
  return canvas.getContext()
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/jpeg' }))
})

describe('image-dimension 组件', () => {
  it('渲染投放区与全部选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('opt-preset')).toBeTruthy()
    expect(screen.getByTestId('opt-width')).toBeTruthy()
    expect(screen.getByTestId('opt-height')).toBeTruthy()
    expect(screen.getByTestId('opt-fit')).toBeTruthy()
    expect(screen.getByTestId('opt-bgcolor')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    // 默认 contain，无拉伸警告
    expect(screen.queryByTestId('stretch-warning')).toBeNull()
  })

  it('上传合法图片后显示结果、前后预览与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('preview')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('contain 模式：目标尺寸画布 + 背景填充 + 整图居中绘制', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 默认预设 1920x1080
    expect(mockCreateCanvas).toHaveBeenCalledWith(1920, 1080)
    const ctx = lastCtx()
    expect(ctx.fillStyle).toBe('#ffffff')
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1920, 1080)
    // 800x600 → 1920x1080：等比 1.8 倍 → 1440x1080，offsetX=240
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      800,
      600,
      240,
      0,
      1440,
      1080,
    )
  })

  it('cover 模式：居中裁剪源图后填满目标尺寸，背景色选项隐藏', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    mockCreateCanvas.mockClear()
    fireEvent.change(screen.getByTestId('opt-fit'), { target: { value: 'cover' } })
    await waitFor(() => expect(mockCreateCanvas).toHaveBeenCalledWith(1920, 1080))
    // 800x600 → 1920x1080：scale=2.4 → 裁 800x450，srcY=75
    expect(lastCtx().drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      75,
      800,
      450,
      0,
      0,
      1920,
      1080,
    )
    expect(screen.queryByTestId('opt-bgcolor')).toBeNull()
  })

  it('stretch 模式：直接拉伸并显示变形提示', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.change(screen.getByTestId('opt-fit'), { target: { value: 'stretch' } })
    await waitFor(() => expect(mockDrawScaled).toHaveBeenCalled())
    expect(mockDrawScaled).toHaveBeenCalledWith(expect.anything(), 800, 600, 1920, 1080)
    expect(screen.getByTestId('stretch-warning')).toBeTruthy()
  })

  it('预设切换更新宽高；切回自定义保持宽高', async () => {
    render(<Tool />)
    const width = screen.getByTestId('opt-width') as HTMLInputElement
    const height = screen.getByTestId('opt-height') as HTMLInputElement
    const preset = screen.getByTestId('opt-preset') as HTMLSelectElement
    await act(async () => {
      fireEvent.change(preset, { target: { value: '512x512' } })
    })
    expect(width.value).toBe('512')
    expect(height.value).toBe('512')
    await act(async () => {
      fireEvent.change(preset, { target: { value: 'custom' } })
    })
    expect(preset.value).toBe('custom')
    expect(width.value).toBe('512')
  })

  it('手动改宽高后预设变为自定义', async () => {
    render(<Tool />)
    const preset = screen.getByTestId('opt-preset') as HTMLSelectElement
    expect(preset.value).toBe('1920x1080')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '100' } })
    })
    expect(preset.value).toBe('custom')
  })

  it('宽度为 0 时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 0 触发范围错误
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '0' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('宽度超上限时显示错误', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '20000' } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('宽度清空时显示错误', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-height'), { target: { value: '' } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('背景色非法时显示错误', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-bgcolor'), { target: { value: 'red' } })
    })
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('背景色无效'))
  })

  it('背景色支持 #rgb 缩写并归一化', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-bgcolor'), { target: { value: '#0f0' } })
    })
    await waitFor(() => expect(lastCtx().fillStyle).toBe('#00ff00'))
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件超过 50MB 显示错误', async () => {
    render(<Tool />)
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 })
    await upload(big)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('canvas 上下文不可用时显示错误', async () => {
    mockCreateCanvas.mockImplementationOnce(
      () => ({ width: 1, height: 1, getContext: () => null }) as never,
    )
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('上下文不可用'))
  })

  it('导出失败显示错误', async () => {
    mockCanvasToBlob.mockRejectedValueOnce(new Error('导出失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('导出失败'))
  })

  it('质量非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('选项变更后自动重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('无文件时选项变更不处理', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '100' } })
    })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('处理中显示 processing 指示', async () => {
    let resolveLoad!: (img: { width: number; height: number }) => void
    mockLoadImage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }) as never,
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile()] } })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      resolveLoad({ width: 800, height: 600 })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-dimension\.jpg$/)
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
