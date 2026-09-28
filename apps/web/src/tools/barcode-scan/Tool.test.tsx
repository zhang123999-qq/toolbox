// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['scaled'], { type: 'image/png' })),
  drawScaled: vi.fn(() => ({ width: 2000, height: 1500 })),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

vi.mock('@zxing/library', () => {
  const decodeFromImageElement = vi.fn()
  class BrowserMultiFormatReader {
    static __decodeMock = decodeFromImageElement
    hints: unknown
    constructor(hints?: unknown) {
      this.hints = hints
    }
    decodeFromImageElement = decodeFromImageElement
  }
  class NotFoundException extends Error {
    constructor(message = 'No MultiFormat Readers were able to detect the code.') {
      super(message)
      this.name = 'NotFoundException'
    }
  }
  // 数字枚举的正反查表（与 @zxing/library 的 BarcodeFormat 一致）
  const formats: Record<string, number | string> = {
    EAN_13: 7,
    EAN_8: 8,
    UPC_A: 9,
    UPC_E: 10,
    CODE_128: 4,
    CODE_39: 5,
    ITF: 6,
  }
  for (const [k, v] of Object.entries(formats)) {
    formats[String(v)] = k
  }
  return {
    BrowserMultiFormatReader,
    DecodeHintType: { POSSIBLE_FORMATS: 'POSSIBLE_FORMATS' },
    BarcodeFormat: formats,
    NotFoundException,
  }
})

import {
  canvasToBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)
const mockReadDataURL = vi.mocked(readFileAsDataURL)
const mockDecode = (
  BrowserMultiFormatReader as unknown as { __decodeMock: ReturnType<typeof vi.fn> }
).__decodeMock
const MockedNotFound = NotFoundException as unknown as new () => Error

afterEach(() => {
  cleanup()
})

function makeFile(name = 'barcode.png', type = 'image/png', size = 1024) {
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
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    configurable: true,
  })
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => ({ width: 2000, height: 1500 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['s'], { type: 'image/png' }))
  mockReadDataURL.mockImplementation(async () => 'data:image/png;base64,preview')
  mockDecode.mockReset()
  mockDecode.mockResolvedValue({
    getText: () => '6901234567890',
    getBarcodeFormat: () => 7,
  })
})

describe('barcode-scan 组件', () => {
  it('渲染投放区与文件输入', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
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
    expect(mockDecode).not.toHaveBeenCalled()
  })

  it('上传图片后显示识别结果：文本 + 码制中文名 + 预览', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('result-text').textContent).toBe('6901234567890')
    // 枚举值 7 → EAN_13 → 中文名 EAN-13
    expect(screen.getByTestId('format').textContent).toContain('EAN-13')
    expect(screen.getByTestId('preview')).toBeTruthy()
    expect(screen.getByTestId('copy')).toBeTruthy()
    expect(mockDecode).toHaveBeenCalledTimes(1)
  })

  it('小图不缩放直接识别', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockDrawScaled).not.toHaveBeenCalled()
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('大图先等比缩放到 2000 再识别', async () => {
    mockLoadImage.mockResolvedValueOnce({ width: 4000, height: 3000 } as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockDrawScaled).toHaveBeenCalledWith(expect.anything(), 4000, 3000, 2000, 1500)
    expect(mockCanvasToBlob).toHaveBeenCalled()
    expect(mockDecode).toHaveBeenCalledTimes(1)
  })

  it('未知码制枚举值时显示 UNKNOWN 兜底', async () => {
    mockDecode.mockResolvedValueOnce({
      getText: () => 'XYZ',
      getBarcodeFormat: () => 999,
    })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('format').textContent).toContain('UNKNOWN')
  })

  it('未识别到条形码时友好提示', async () => {
    mockDecode.mockRejectedValueOnce(new MockedNotFound())
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('未识别到条形码')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件过大显示错误', async () => {
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1, configurable: true })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mockDecode).not.toHaveBeenCalled()
  })

  it('图片加载失败显示原始错误信息', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('复制按钮写入剪贴板并显示已复制', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('copied')).toBeTruthy())
    expect(vi.mocked(navigator.clipboard.writeText)).toHaveBeenCalledWith('6901234567890')
  })

  it('复制失败显示降级提示', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('复制失败')
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
})
