// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { decompressFrames, parseGIF } from 'gifuct-js'
import Tool from './Tool'
import { MAX_FILE_SIZE, MAX_FRAMES } from './utils'

vi.mock('gifuct-js', () => ({
  parseGIF: vi.fn(),
  decompressFrames: vi.fn(),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import { downloadBlob } from '../../lib/image'

const mockParseGIF = vi.mocked(parseGIF)
const mockDecompressFrames = vi.mocked(decompressFrames)
const mockDownloadBlob = vi.mocked(downloadBlob)

interface FakeFrame {
  dims: { width: number; height: number; top: number; left: number }
  delay: number
  patch: Uint8ClampedArray
}

function makeFrame(width: number, height: number, delay = 10): FakeFrame {
  return {
    dims: { width, height, top: 0, left: 0 },
    delay,
    patch: new Uint8ClampedArray(width * height * 4),
  }
}

function makeGifFile(name = 'anim.gif', size = 2048): File {
  const blob = new Blob([new Uint8Array(size)], { type: 'image/gif' })
  return new File([blob], name, { type: 'image/gif' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom 没有真实 canvas/ImageData：桩掉 2d 上下文、toDataURL 与 ImageData
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    putImageData: vi.fn(),
  } as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,frame')
  class FakeImageData {
    data: Uint8ClampedArray
    width: number
    height: number
    constructor(sw: number, sh: number) {
      this.width = sw
      this.height = sh
      this.data = new Uint8ClampedArray(sw * sh * 4)
    }
  }
  globalThis.ImageData = FakeImageData as unknown as typeof ImageData
  // 单帧下载走 fetch(dataURL).blob() 再经 downloadBlob 落盘
  globalThis.fetch = vi.fn(async () => ({
    blob: async () => new Blob(['png-bytes'], { type: 'image/png' }),
  })) as unknown as typeof fetch
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockParseGIF.mockImplementation(() => ({ lsd: { width: 100, height: 80 } }) as never)
  mockDecompressFrames.mockImplementation(
    () => [makeFrame(100, 80, 10), makeFrame(100, 80, 25)] as never,
  )
})

describe('gif-split 组件', () => {
  it('渲染投放区、说明与逐个保存提示', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('download-all-note')).toBeTruthy()
    expect(screen.queryByTestId('frames')).toBeNull()
  })

  it('上传 GIF 后显示帧列表与每帧下载按钮', async () => {
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('frames')).toBeTruthy())
    expect(screen.getByTestId('frame-1')).toBeTruthy()
    expect(screen.getByTestId('frame-2')).toBeTruthy()
    expect(screen.getByTestId('frame-info-1')).toBeTruthy()
    expect(screen.getByTestId('frame-download-1')).toBeTruthy()
    expect(screen.getByTestId('download-all')).toBeTruthy()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(mockParseGIF).toHaveBeenCalled()
    expect(mockDecompressFrames).toHaveBeenCalled()
  })

  it('上传非 GIF 文件显示错误', async () => {
    render(<Tool />)
    const file = new File([new Blob(['x'])], 'a.png', { type: 'image/png' })
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('不是 GIF 文件'))
    expect(screen.queryByTestId('frames')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    const file = makeGifFile('big.gif')
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
  })

  it('GIF 解析失败显示错误且不崩溃', async () => {
    mockParseGIF.mockImplementationOnce(() => {
      throw new Error('bad gif data')
    })
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('bad gif data'))
    expect(screen.queryByTestId('frames')).toBeNull()
  })

  it('帧数超限显示“帧数过多”错误', async () => {
    const many = Array.from({ length: MAX_FRAMES + 1 }, () => makeFrame(4, 4, 5))
    mockDecompressFrames.mockReturnValueOnce(many as never)
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('帧数过多'))
  })

  it('逻辑屏尺寸超限显示错误', async () => {
    mockParseGIF.mockReturnValueOnce({ lsd: { width: 5000, height: 100 } } as never)
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('GIF 尺寸过大'))
  })

  it('帧数为 0 显示错误', async () => {
    mockDecompressFrames.mockReturnValueOnce([])
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('没有可分解的帧'))
  })

  it('帧 patch 尺寸无效显示错误', async () => {
    mockDecompressFrames.mockReturnValueOnce([
      {
        dims: { width: 0, height: 80, top: 0, left: 0 },
        delay: 5,
        patch: new Uint8ClampedArray(0),
      },
    ] as never)
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('GIF 帧尺寸无效'))
  })

  it('Canvas 2D 不可用时显示错误', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null)
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('Canvas 2D'))
  })

  it('解析中显示 loading，完成后消失', async () => {
    // 把 file.arrayBuffer() 做成可控闸门：解析开始前卡住，断言 loading 出现后再放行。
    // 不碰 gifuct-js 的 mock 队列，避免 deferred promise 与 act 刷新时序纠缠。
    const file = makeGifFile()
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const realArrayBuffer = file.arrayBuffer.bind(file)
    vi.spyOn(file, 'arrayBuffer').mockImplementation(async () => {
      await gate
      return realArrayBuffer()
    })
    render(<Tool />)
    fireEvent.change(screen.getByTestId('file-input') as HTMLInputElement, {
      target: { files: [file] },
    })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      release()
    })
    await waitFor(() => expect(screen.queryByTestId('processing')).toBeNull())
    // 闸门放行后走默认 mock：2 帧，正常渲染帧列表
    await waitFor(() => expect(screen.getByTestId('frames')).toBeTruthy())
  })

  it('单帧下载调用 downloadBlob 且文件名含序号', async () => {
    render(<Tool />)
    await upload(makeGifFile('anim.gif'))
    await waitFor(() => expect(screen.getByTestId('frame-download-2')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('frame-download-2'))
    })
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('anim-frame-02.png')
  })

  it('全部下载逐个触发每帧下载', async () => {
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('download-all')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('download-all'))
    })
    await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalledTimes(2))
    const names = mockDownloadBlob.mock.calls.map((call) => call[1])
    expect(names).toEqual(['anim-frame-01.png', 'anim-frame-02.png'])
  })

  it('重置清空帧列表与文件名', async () => {
    render(<Tool />)
    await upload(makeGifFile())
    await waitFor(() => expect(screen.getByTestId('frames')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('frames')).toBeNull()
    expect(screen.queryByTestId('download-all')).toBeNull()
  })

  it('拖拽 GIF 到投放区开始解析', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makeGifFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('frames')).toBeTruthy())
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
    expect(mockParseGIF).not.toHaveBeenCalled()
  })
})
