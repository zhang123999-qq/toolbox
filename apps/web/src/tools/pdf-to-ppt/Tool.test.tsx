// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Mock } from 'vitest'
import Tool from './Tool'

vi.mock('pdfjs-dist', () => ({
  getDocument: vi.fn(),
  GlobalWorkerOptions: { workerSrc: '' },
  PasswordException: class PasswordException extends Error {
    constructor(message?: string) {
      super(message)
      this.name = 'PasswordException'
    }
  },
  PasswordResponses: { NEED_PASSWORD: 1, INCORRECT_PASSWORD: 2 },
}))

// pptxgenjs 以类 mock：构造恒成功（不受 restoreMocks 影响），
// 内部方法为 hoisted 的 vi.fn，可直接断言装配参数。
const pptxMocks = vi.hoisted(() => {
  const addText = vi.fn()
  const addSlide = vi.fn()
  const defineLayout = vi.fn()
  const write = vi.fn()
  const instances: Array<{ layout: string }> = []
  class MockPptx {
    layout = ''
    defineLayout = defineLayout
    addSlide = addSlide
    write = write
    constructor() {
      instances.push(this)
    }
  }
  return { addText, addSlide, defineLayout, write, instances, MockPptx }
})

vi.mock('pptxgenjs', () => ({
  default: pptxMocks.MockPptx,
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import { PasswordException, PasswordResponses, getDocument } from 'pdfjs-dist'
import { downloadBlob } from '../../lib/image'

const mockGetDocument = vi.mocked(getDocument)
const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'doc.pdf') {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // %PDF-1.4
  return new File([bytes], name, { type: 'application/pdf' })
}

function makeNonPdfFile() {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]) // PNG 魔数
  return new File([bytes], 'a.png', { type: 'image/png' })
}

/** 文本条目：transform [fs,0,0,fs,x,y] */
function ti(str: string, x: number, y: number, fontSize = 12, width = 40) {
  return { str, transform: [fontSize, 0, 0, fontSize, x, y], width, height: fontSize }
}

interface MockPage {
  width: number
  height: number
  items: ReturnType<typeof ti>[]
}

/** 模拟 pdfjs：pages[i] 为第 i+1 页 { 尺寸， 文本条目 } */
function mockPdfPages(pages: MockPage[]) {
  mockGetDocument.mockImplementation(
    () =>
      ({
        promise: Promise.resolve({
          numPages: pages.length,
          getPage: (n: number) =>
            Promise.resolve({
              getViewport: () => ({ width: pages[n - 1].width, height: pages[n - 1].height }),
              getTextContent: () => Promise.resolve({ items: pages[n - 1].items }),
            }),
        }),
      }) as never,
  )
}

const PPTX_BLOB = () =>
  new Blob(['fake-pptx'], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })

function defaultPages(): MockPage[] {
  return [
    { width: 612, height: 792, items: [ti('第一页行1', 72, 700), ti('第一页行2', 72, 680)] },
    { width: 612, height: 792, items: [ti('第二页行1', 72, 700)] },
  ]
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** addText 第 n 次调用的 (文本, 选项) */
function addTextCall(n: number) {
  const [text, opts] = pptxMocks.addText.mock.calls[n] as [
    string,
    { x: number; y: number; w: number; h: number; fontSize: number },
  ]
  return { text, opts }
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  pptxMocks.instances.length = 0
  pptxMocks.addSlide.mockImplementation(() => ({ addText: pptxMocks.addText }))
  pptxMocks.write.mockResolvedValue(PPTX_BLOB())
  mockPdfPages(defaultPages())
})

describe('pdf-to-ppt 组件', () => {
  it('渲染投放区与说明区结构', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
  })

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toContain('application/pdf')
  })

  it('上传 PDF 后按页生成幻灯片、文本按坐标成框', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())

    expect(mockGetDocument).toHaveBeenCalled()
    // 版式：第一页 612×792pt → 8.5×11in
    expect(pptxMocks.defineLayout).toHaveBeenCalledTimes(1)
    expect(pptxMocks.defineLayout).toHaveBeenCalledWith({
      name: 'PDF_PAGE',
      width: 8.5,
      height: 11,
    })
    expect(pptxMocks.instances[0].layout).toBe('PDF_PAGE')
    // 两页 → 两张幻灯片
    expect(pptxMocks.addSlide).toHaveBeenCalledTimes(2)
    // 三行文本 → 三个文本框（第一页两行、第二页一行）
    expect(pptxMocks.addText).toHaveBeenCalledTimes(3)
    expect(addTextCall(0).text).toBe('第一页行1')
    expect(addTextCall(1).text).toBe('第一页行2')
    expect(addTextCall(2).text).toBe('第二页行1')
    // 坐标换算：x=72pt→1in；y=(792-700-12×0.85)/72；w=40/72；h=12×1.2/72
    const { opts } = addTextCall(0)
    expect(opts.x).toBeCloseTo(1, 10)
    expect(opts.y).toBeCloseTo(81.8 / 72, 10)
    expect(opts.w).toBeCloseTo(40 / 72, 10)
    expect(opts.h).toBeCloseTo(0.2, 10)
    expect(opts.fontSize).toBe(12)
    // blob 输出
    expect(pptxMocks.write).toHaveBeenCalledWith({ outputType: 'blob' })
    expect(URL.createObjectURL).toHaveBeenCalled()
    // 结果信息：页数与输出文件名
    expect(screen.getByTestId('result-info')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('空页生成无文本框的空白幻灯片', async () => {
    mockPdfPages([{ width: 612, height: 792, items: [] }])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(pptxMocks.addSlide).toHaveBeenCalledTimes(1)
    expect(pptxMocks.addText).not.toHaveBeenCalled()
    expect(pptxMocks.write).toHaveBeenCalledTimes(1)
  })

  it('下载按钮调用 downloadBlob，文件名为 -converted.pptx', async () => {
    render(<Tool />)
    await upload(makePdfFile('report.pdf'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toBe('report-converted.pptx')
  })

  it('上传非 PDF 显示错误且无结果', async () => {
    render(<Tool />)
    await upload(makeNonPdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('超 50MB 文件直接报错', async () => {
    const file = makePdfFile()
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('加密 PDF 显示错误且无结果', async () => {
    mockGetDocument.mockImplementationOnce(
      () =>
        ({
          promise: Promise.reject(
            new PasswordException('No password given', PasswordResponses.NEED_PASSWORD),
          ),
        }) as never,
    )
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(pptxMocks.write).not.toHaveBeenCalled()
  })

  it('PDF 解析失败透出原始错误', async () => {
    mockGetDocument.mockImplementationOnce(
      () => ({ promise: Promise.reject(new Error('Invalid PDF structure')) }) as never,
    )
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('Invalid PDF structure')
  })

  it('处理中显示逐页进度，完成后消失', async () => {
    let release!: (doc: unknown) => void
    mockGetDocument.mockImplementationOnce(
      () =>
        ({
          promise: new Promise<unknown>((resolve) => {
            release = resolve
          }),
        }) as never,
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makePdfFile()] } })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    expect(screen.getByTestId('processing').textContent).toContain('0/0')
    await act(async () => {
      release({
        numPages: 2,
        getPage: (n: number) =>
          Promise.resolve({
            getViewport: () => ({ width: 612, height: 792 }),
            getTextContent: () => Promise.resolve({ items: [ti(`p${n}`, 72, 700)] }),
          }),
      })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('重置清空错误', async () => {
    render(<Tool />)
    await upload(makeNonPdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('重置清空成功结果', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makePdfFile()] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('幻灯片实例方法为 mock 函数（装配链路完整）', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const slide = pptxMocks.addSlide.mock.results[0].value as { addText: Mock }
    expect(vi.mocked(slide.addText)).toBe(pptxMocks.addText)
  })
})
