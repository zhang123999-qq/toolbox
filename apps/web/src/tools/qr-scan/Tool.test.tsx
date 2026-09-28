// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_SIZE } from './utils'
import Tool from './Tool'

const { mockDecodeFromImageElement } = vi.hoisted(() => ({
  mockDecodeFromImageElement: vi.fn(),
}))

vi.mock('@zxing/library', () => {
  // 语义与真实 zxing 一致：BarcodeFormat 为数字枚举（带反向映射）
  function BrowserMultiFormatReader(this: unknown, _hints: unknown) {
    return { decodeFromImageElement: mockDecodeFromImageElement }
  }
  return {
    BrowserMultiFormatReader: vi.fn(BrowserMultiFormatReader),
    DecodeHintType: { POSSIBLE_FORMATS: 2 },
    BarcodeFormat: { QR_CODE: 11, 11: 'QR_CODE' },
  }
})

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['scaled'], { type: 'image/png' })),
  drawScaled: vi.fn(() => ({ width: 2000, height: 1500 })),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
}))

import { BrowserMultiFormatReader } from '@zxing/library'
import { canvasToBlob, drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const MockReader = vi.mocked(BrowserMultiFormatReader)
const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)
const mockWriteText = vi.fn()

afterEach(() => {
  cleanup()
})

function makeFile(name = 'qr.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

/** 构造 zxing Result 形状的 mock：默认文本含换行，码制为 QR_CODE(11) */
function mockDecoded(text = 'https://example.com\n第二行', format = 11) {
  return { getText: () => text, getBarcodeFormat: () => format }
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
  mockDrawScaled.mockImplementation(() => ({ width: 2000, height: 1500 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['s'], { type: 'image/png' }))
  mockDecodeFromImageElement.mockReset()
  mockDecodeFromImageElement.mockResolvedValue(mockDecoded())
  mockWriteText.mockReset()
  mockWriteText.mockResolvedValue(undefined)
  // jsdom 下 navigator.clipboard 未定义，手动 stub
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    configurable: true,
  })
})

describe('qr-scan 组件', () => {
  it('渲染投放区，初始无结果/错误/loading', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('processing')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('上传图片后显示解码文本（保留换行）与码制', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const textEl = screen.getByTestId('result-text')
    expect(textEl.tagName).toBe('PRE')
    expect(textEl.textContent).toBe('https://example.com\n第二行')
    // 码制中文名来自纯函数 formatBarcodeFormat，非 i18n，合并前也可断言
    expect(screen.getByTestId('result-format').textContent).toContain('二维码')
    expect(screen.getByTestId('copy')).toBeTruthy()
  })

  it('reader 收到仅 QR_CODE 的 hints', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(MockReader).toHaveBeenCalledTimes(1)
    const hints = MockReader.mock.calls[0][0] as Map<number, number[]>
    expect(hints.get(2)).toEqual([11])
  })

  it('大图先缩放再识别，并释放临时 URL', async () => {
    mockLoadImage.mockImplementationOnce(async () => ({ width: 4000, height: 3000 }) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockDrawScaled).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    expect(mockDecodeFromImageElement).toHaveBeenCalledWith('blob:mock-url')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('小图直接用原图元素解码，不走缩放分支', async () => {
    const img = { width: 800, height: 600 }
    mockLoadImage.mockImplementationOnce(async () => img as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockDrawScaled).not.toHaveBeenCalled()
    expect(mockDecodeFromImageElement).toHaveBeenCalledWith(img)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('未识别到二维码时显示错误（无结果）', async () => {
    mockDecodeFromImageElement.mockRejectedValueOnce(new Error('NotFoundException'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('超大文件直接报错，不进入解码', async () => {
    render(<Tool />)
    await upload(makeFile('big.png', 'image/png', MAX_FILE_SIZE + 1))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('图片解码失败显示底层错误（与"未识别到"区分）', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('图片解码失败：文件可能已损坏或格式不受支持'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('图片解码失败'))
  })

  it('复制按钮把解码文本写入剪贴板', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(mockWriteText).toHaveBeenCalledWith('https://example.com\n第二行'))
  })

  it('复制失败时降级提示错误', async () => {
    mockWriteText.mockRejectedValueOnce(new Error('denied'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('识别中显示 loading 状态', async () => {
    let resolveLoad!: (img: HTMLImageElement) => void
    const gate = new Promise<HTMLImageElement>((res) => {
      resolveLoad = res
    })
    mockLoadImage.mockImplementationOnce(() => gate)
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    act(() => {
      fireEvent.change(input, { target: { files: [makeFile()] } })
    })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      resolveLoad({ width: 800, height: 600 } as HTMLImageElement)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('重置清空结果', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('错误态也提供重置', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
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
