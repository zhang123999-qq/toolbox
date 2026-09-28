// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

// jsdom 无 canvas：在 lib/image mock 中让 createCanvas 返回假 canvas，
// 其 getContext 返回自带 getImageData/putImageData/drawImage 的 mock ctx。
// 注意：getImageData 每次返回源缓冲的新鲜拷贝（与真实浏览器一致），
// 否则组件 putImageData 前的 data.set 会污染后续测试的输入。
const { mockCtx, mockImageData } = vi.hoisted(() => {
  const source = { data: new Uint8ClampedArray(4 * 4 * 4), width: 4, height: 4 }
  const ctx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(source.data),
      width: source.width,
      height: source.height,
    })),
    putImageData: vi.fn(),
  }
  return { mockCtx: ctx, mockImageData: source }
})

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  createCanvas: vi.fn((w: number, h: number) => ({
    width: w,
    height: h,
    getContext: () => mockCtx,
  })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 4, height: 4 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

// i18n 键由仓库流程稍后统一合并；此处只断言 data-testid 结构，不断言 t() 文案。
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

type RGBA = [number, number, number, number]

/** 向共享的假 getImageData 缓冲写入像素 */
function setPixels(fill: (x: number, y: number) => RGBA) {
  const { data, width, height } = mockImageData
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
}

const WHITE: RGBA = [255, 255, 255, 255]
const RED: RGBA = [255, 0, 0, 255]
const GREEN: RGBA = [0, 255, 0, 255]

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

function switchToChroma() {
  fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'chroma' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  setPixels(() => WHITE)
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 4, height: 4 }) as never)
  mockCreateCanvas.mockImplementation(
    (w: number, h: number) => ({ width: w, height: h, getContext: () => mockCtx }) as never,
  )
  mockCanvasToBlob.mockImplementation(async () => new Blob(['png'], { type: 'image/png' }))
})

describe('background-remove 组件', () => {
  it('渲染投放区与选项（默认 edge 模式无取色器）', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-mode')).toBeTruthy()
    expect(screen.getByTestId('opt-tolerance')).toBeTruthy()
    expect(screen.queryByTestId('opt-color')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('切换到色度键模式显示取色器', () => {
    render(<Tool />)
    switchToChroma()
    expect(screen.getByTestId('opt-color')).toBeTruthy()
  })

  it('边缘抠除成功：白底红主体 → 显示结果与统计', async () => {
    setPixels((x, y) => (x >= 1 && x <= 2 && y >= 1 && y <= 2 ? RED : WHITE))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 抠除结果写回了 canvas
    expect(mockCtx.putImageData).toHaveBeenCalled()
  })

  it('色度键成功：全绿图 + 默认绿色目标 → 显示结果', async () => {
    setPixels(() => GREEN)
    render(<Tool />)
    switchToChroma()
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('未检测到可移除背景（全透明图）→ 报错且无结果', async () => {
    setPixels(() => [0, 0, 0, 0])
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('色度键零命中 → 报错', async () => {
    setPixels(() => RED) // 目标默认 #00ff00，红色距离远
    render(<Tool />)
    switchToChroma()
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('容差非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-tolerance'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('Canvas 2D 上下文不可用显示错误', async () => {
    mockCreateCanvas.mockReturnValueOnce({
      width: 4,
      height: 4,
      getContext: () => null,
    } as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('未上传时改选项不触发处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-tolerance'), { target: { value: '40' } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('有文件时选项变更重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-tolerance'), { target: { value: '40' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('色度键下更改目标颜色重新处理', async () => {
    setPixels(() => GREEN)
    render(<Tool />)
    switchToChroma()
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      // #00ff01 与绿色距离为 1，容差 25 下仍全命中，保证重新处理成功
      fireEvent.change(screen.getByTestId('opt-color'), { target: { value: '#00ff01' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('下载按钮调用 downloadBlob，文件名为 -nobg.png', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-nobg\.png$/)
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
