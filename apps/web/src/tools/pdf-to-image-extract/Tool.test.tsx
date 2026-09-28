// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfjsLib from 'pdfjs-dist'
import Tool from './Tool'
import { MAX_FILE_SIZE, MAX_IMAGES } from './utils'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {} as Record<string, string>,
  OPS: { paintImageXObject: 85, paintInlineImageXObject: 86 },
  ImageKind: { GRAYSCALE_1BPP: 1, RGB_24BPP: 2, RGBA_32BPP: 3 },
  getDocument: vi.fn(),
}))

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(),
  downloadBlob: vi.fn(),
}))

import { canvasToBlob, downloadBlob } from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockGetDocument = vi.mocked(pdfjsLib.getDocument)

const makeImgData = (w: number, h: number) => ({
  width: w,
  height: h,
  kind: 3,
  data: new Uint8ClampedArray(w * h * 4).fill(200),
})

const mockObjsGet = vi.fn()
const mockGetOperatorList = vi.fn()
const makePage = () => ({
  getOperatorList: mockGetOperatorList,
  objs: { get: mockObjsGet },
})
const mockGetPage = vi.fn(async () => makePage())
const mockDoc = { numPages: 2, getPage: mockGetPage }

const mockPutImageData = vi.fn()
const mockGetContext = vi.fn()

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'doc.pdf', size = 1024) {
  const bytes = new Uint8Array(size)
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-
  return new File([bytes], name, { type: 'application/pdf' })
}

function makeNonPdfFile() {
  return new File([new Uint8Array([1, 2, 3, 4, 5, 6])], 'a.txt', { type: 'text/plain' })
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
  mockGetContext.mockReturnValue({
    putImageData: mockPutImageData,
    createImageData: (w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }),
  })
  HTMLCanvasElement.prototype.getContext = mockGetContext as never
  mockGetDocument.mockImplementation((() => ({ promise: Promise.resolve(mockDoc) })) as never)
  mockGetPage.mockImplementation(async () => makePage())
  mockGetOperatorList.mockImplementation(async () => ({ fnArray: [], argsArray: [] }))
  mockObjsGet.mockImplementation(() => makeImgData(10, 10))
  mockCanvasToBlob.mockImplementation(async () => new Blob(['p'], { type: 'image/png' }))
})

describe('pdf-to-image-extract 组件', () => {
  it('渲染投放区与格式选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
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
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('非 PDF 文件显示错误', async () => {
    render(<Tool />)
    await upload(makeNonPdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    const file = makePdfFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('加密 PDF 显示错误', async () => {
    const err = new Error('No password given')
    err.name = 'PasswordException'
    mockGetDocument.mockImplementation((() => ({ promise: Promise.reject(err) })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('损坏的 PDF 显示错误', async () => {
    mockGetDocument.mockImplementation((() => ({
      promise: Promise.reject(new Error('Invalid PDF')),
    })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('提取命名图片与内联图片（多页）', async () => {
    const inline = makeImgData(4, 4)
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [85, 86],
      argsArray: [['img_1'], [inline]],
    }))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 2 页 × 每页 2 张 = 4 张
    expect(screen.getAllByTestId('image-result')).toHaveLength(4)
    expect(screen.getAllByTestId('download-image')).toHaveLength(4)
    expect(screen.getByTestId('summary').textContent).toContain('4')
    expect(mockGetContext).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('无内嵌图片时显示空状态', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    // 文件名已记录，重置按钮可见
    expect(screen.getByTestId('reset')).toBeTruthy()
  })

  it('图片对象解析失败计入跳过，不中断整体', async () => {
    const inline = makeImgData(4, 4)
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [85, 86],
      argsArray: [['bad'], [inline]],
    }))
    mockObjsGet.mockImplementation((name: string) => {
      if (name === 'bad') throw new Error("Requesting object that isn't resolved yet bad.")
      return makeImgData(10, 10)
    })
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 2 页 × 每页 1 张成功 = 2 张，2 张被跳过
    expect(screen.getAllByTestId('image-result')).toHaveLength(2)
    expect(screen.getByTestId('skipped').textContent).toContain('2')
  })

  it('全部失败时空状态仍显示跳过数', async () => {
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [85],
      argsArray: [['bad']],
    }))
    mockObjsGet.mockImplementation(() => {
      throw new Error('not resolved')
    })
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy())
    expect(screen.getByTestId('skipped').textContent).toContain('2')
  })

  it('非图片对象被跳过', async () => {
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [85],
      argsArray: [['weird']],
    }))
    mockObjsGet.mockReturnValue({ nope: true })
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy())
  })

  it('图片数量超上限时截断并提示', async () => {
    const names = Array.from({ length: MAX_IMAGES + 5 }, (_, i) => `img_${i}`)
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: names.map(() => 85),
      argsArray: names.map((n) => [n]),
    }))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getAllByTestId('image-result')).toHaveLength(MAX_IMAGES)
    expect(screen.getByTestId('capped')).toBeTruthy()
  })

  it('超大尺寸图片被跳过', async () => {
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [86],
      argsArray: [[{ width: 20000, height: 20000, kind: 3, data: new Uint8ClampedArray(4) }]],
    }))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy())
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('数据异常的图片被跳过', async () => {
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [86],
      argsArray: [[{ width: 2, height: 2, kind: 99, data: new Uint8Array(5) }]],
    }))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy())
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('Canvas 2D 不可用时报错', async () => {
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [86],
      argsArray: [[makeImgData(4, 4)]],
    }))
    mockGetContext.mockReturnValueOnce(null)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('单张下载调用 downloadBlob，文件名含页码与序号', async () => {
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [85],
      argsArray: [['img_1']],
    }))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getAllByTestId('download-image')[0])
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('doc-p1-img1.png')
  })

  it('格式切换为 jpeg 后重新提取', async () => {
    mockGetOperatorList.mockImplementation(async () => ({
      fnArray: [86],
      argsArray: [[makeImgData(4, 4)]],
    }))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCanvasToBlob).toHaveBeenLastCalledWith(expect.anything(), 'image/png')
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    await waitFor(() => {
      const mimes = mockCanvasToBlob.mock.calls.map((c) => c[1])
      expect(mimes).toContain('image/jpeg')
    })
    expect(mockDownloadBlob).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByTestId('download-image')[0])
    expect(mockDownloadBlob.mock.calls[0][1]).toBe('doc-p1-img1.jpg')
  })

  it('选项变更无文件时不处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('提取过程中显示进度', async () => {
    let resolveDoc: (doc: unknown) => void = () => {}
    mockGetDocument.mockImplementation((() => ({
      promise: new Promise<unknown>((r) => {
        resolveDoc = r
      }),
    })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    resolveDoc(mockDoc)
    await waitFor(() => expect(screen.queryByTestId('processing')).toBeNull())
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('empty')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('empty')).toBeTruthy())
  })
})
