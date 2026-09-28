// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

vi.mock('xlsx', () => ({
  utils: {
    aoa_to_sheet: vi.fn((rows: unknown[][]) => ({ __rows: rows })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn(() => new Uint8Array([0x50, 0x4b, 3, 4])),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import * as XLSX from 'xlsx'
import { PasswordException, PasswordResponses, getDocument } from 'pdfjs-dist'
import { downloadBlob } from '../../lib/image'

const mockGetDocument = vi.mocked(getDocument)
const mockAoaToSheet = vi.mocked(XLSX.utils.aoa_to_sheet)
const mockBookNew = vi.mocked(XLSX.utils.book_new)
const mockAppendSheet = vi.mocked(XLSX.utils.book_append_sheet)
const mockWrite = vi.mocked(XLSX.write)
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

/** 构造 pdfjs 文本片段：str/x/y/宽 */
function cell(str: string, x: number, y: number, width = 30) {
  return {
    str,
    dir: 'ltr',
    transform: [1, 0, 0, 1, x, y],
    width,
    height: 12,
    fontName: 'f',
    hasEOL: false,
  }
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** 模拟 pdfjs：pages[i] 为第 i+1 页的文本片段数组 */
function mockPdfPages(pages: unknown[][]) {
  mockGetDocument.mockImplementation(
    () =>
      ({
        promise: Promise.resolve({
          numPages: pages.length,
          getPage: (n: number) =>
            Promise.resolve({
              getTextContent: () => Promise.resolve({ items: pages[n - 1] }),
            }),
        }),
      }) as never,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockPdfPages([[cell('姓名', 50, 700, 20), cell('张三', 200, 700, 20)], [cell('a', 50, 700, 10)]])
})

describe('pdf-to-excel 组件', () => {
  it('渲染投放区与工作表模式选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('opt-sheetmode')).toBeTruthy()
    // 两个选项：合并为一张表 / 每页一张表
    const select = screen.getByTestId('opt-sheetmode') as HTMLSelectElement
    expect(select.querySelectorAll('option')).toHaveLength(2)
  })

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toContain('application/pdf')
  })

  it('上传 PDF 后生成 xlsx 并显示结果', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockGetDocument).toHaveBeenCalled()
    // 分行分列：第一页 1 行 2 列，第二页 1 行 1 列，merged 页间空行分隔
    expect(mockAoaToSheet).toHaveBeenCalledTimes(1)
    expect(mockAoaToSheet.mock.calls[0][0]).toEqual([['姓名', '张三'], [], ['a']])
    expect(mockBookNew).toHaveBeenCalledTimes(1)
    expect(mockAppendSheet).toHaveBeenCalledTimes(1)
    expect(mockAppendSheet.mock.calls[0][2]).toBe('Sheet1')
    expect(mockWrite).toHaveBeenCalledTimes(1)
    // 结果信息：页数与输出文件名（真实值，非 i18n）
    const info = screen.getByTestId('result-info').textContent ?? ''
    expect(info).toContain('2')
    expect(info).toContain('doc-converted.xlsx')
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('工作表模式切为每页一张表后重新处理', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    mockAppendSheet.mockClear()
    fireEvent.change(screen.getByTestId('opt-sheetmode'), { target: { value: 'perPage' } })
    await waitFor(() => expect(mockAppendSheet).toHaveBeenCalled())
    const names = mockAppendSheet.mock.calls.map((c) => c[2])
    expect(names).toEqual(['第1页', '第2页'])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('无文件时选项变更不触发处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-sheetmode'), { target: { value: 'perPage' } })
    expect(mockGetDocument).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('下载按钮调用 downloadBlob，文件名为 -converted.xlsx', async () => {
    render(<Tool />)
    await upload(makePdfFile('report.pdf'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toBe('report-converted.xlsx')
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

  it('加密 PDF 明确报错', async () => {
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
    expect(mockWrite).not.toHaveBeenCalled()
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

  it('无文本的 PDF 报错且不生成文件', async () => {
    mockPdfPages([[], []])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockWrite).not.toHaveBeenCalled()
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
    // 进度数字为真实 state，非 i18n
    expect(screen.getByTestId('processing').textContent).toContain('0/0')
    await act(async () => {
      release({
        numPages: 1,
        getPage: () =>
          Promise.resolve({
            getTextContent: () => Promise.resolve({ items: [cell('x', 50, 700, 10)] }),
          }),
      })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('重置清空结果与错误', async () => {
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

  it('拖拽无文件时不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: {} })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })
})
