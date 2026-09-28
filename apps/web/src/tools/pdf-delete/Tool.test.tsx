// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfjsLib from 'pdfjs-dist'
import { PDFDocument } from 'pdf-lib'
import Tool from './Tool'
import { MANY_PAGES_WARN, MAX_FILE_SIZE } from './utils'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {} as Record<string, string>,
  getDocument: vi.fn(),
}))

vi.mock('pdf-lib', () => ({
  PDFDocument: { create: vi.fn(), load: vi.fn() },
}))

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(),
  downloadBlob: vi.fn(),
}))

import { canvasToBlob, downloadBlob } from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockGetDocument = vi.mocked(pdfjsLib.getDocument)
const mockPdfCreate = vi.mocked(PDFDocument.create)
const mockPdfLoad = vi.mocked(PDFDocument.load)

const mockRender = vi.fn()
const makePage = () => ({
  getViewport: () => ({ width: 120, height: 160 }),
  render: mockRender,
})
const mockGetPage = vi.fn(async (_n: number) => makePage())
const mockDocWithPages = (n: number) => ({ numPages: n, getPage: mockGetPage })

let mockCopyPages: ReturnType<typeof vi.fn>
let mockSave: ReturnType<typeof vi.fn>
let urlSeq = 0

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'report.pdf', size = 1024) {
  const head = new TextEncoder().encode('%PDF-1.4\n')
  const bytes = new Uint8Array(Math.max(head.length, size))
  bytes.set(head)
  return new File([bytes], name, { type: 'application/pdf' })
}

function makeTextFile() {
  return new File(['hello world'], 'a.txt', { type: 'text/plain' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function uploadAndRenderPages(file: File = makePdfFile()) {
  render(<Tool />)
  await upload(file)
  await waitFor(() => expect(screen.getAllByTestId('page-item')).toHaveLength(3))
}

beforeEach(() => {
  vi.clearAllMocks()
  urlSeq = 0
  URL.createObjectURL = vi.fn(() => `blob:mock-${++urlSeq}`)
  URL.revokeObjectURL = vi.fn()
  mockRender.mockImplementation(() => ({ promise: Promise.resolve() }))
  mockGetPage.mockImplementation(async () => makePage())
  mockGetDocument.mockImplementation((() => ({
    promise: Promise.resolve(mockDocWithPages(3)),
  })) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['t'], { type: 'image/png' }))
  // pdf-lib mock：load 返回 3 页源文档；create 返回可 copyPages 的新文档
  mockPdfLoad.mockImplementation((async () => ({ getPageCount: () => 3 })) as never)
  mockCopyPages = vi.fn(async (_src: unknown, indices: number[]) => indices.map(() => ({})))
  mockSave = vi.fn(async () => new Uint8Array([1, 2, 3]))
  mockPdfCreate.mockImplementation((async () => ({
    copyPages: mockCopyPages,
    addPage: vi.fn(),
    save: mockSave,
  })) as never)
})

describe('pdf-delete 组件', () => {
  it('渲染投放区，初始无页面列表与删除按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.queryByTestId('page-grid')).toBeNull()
    expect(screen.queryByTestId('delete')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toContain('application/pdf')
  })

  it('上传合法 PDF 后渲染缩略图列表与勾选框', async () => {
    await uploadAndRenderPages()
    expect(screen.getAllByTestId('page-check')).toHaveLength(3)
    expect(screen.getByTestId('page-count').textContent).toContain('3')
    expect(screen.getByTestId('selected-count').textContent).toContain('0/3')
    expect(mockGetDocument).toHaveBeenCalled()
    expect(mockGetPage.mock.calls.map((c) => c[0])).toEqual([1, 2, 3])
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(3)
    // 未勾选时删除按钮禁用并提示
    const del = screen.getByTestId('delete') as HTMLButtonElement
    expect(del.disabled).toBe(true)
    expect(screen.getByTestId('delete-hint').textContent).toContain('请先勾选')
    expect(screen.queryByTestId('perf-warn')).toBeNull()
  })

  it('上传非 PDF 显示错误', async () => {
    render(<Tool />)
    await upload(makeTextFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('PDF')
    expect(screen.queryByTestId('page-item')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    const big = makePdfFile('big.pdf', 10)
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(big)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(screen.queryByTestId('page-item')).toBeNull()
  })

  it('加密 PDF 明确报错', async () => {
    mockGetDocument.mockImplementationOnce((() => ({
      promise: Promise.reject(
        Object.assign(new Error('need password'), { name: 'PasswordException' }),
      ),
    })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('已加密'))
    expect(screen.queryByTestId('page-item')).toBeNull()
  })

  it('PDF 解析失败显示错误', async () => {
    mockGetDocument.mockImplementationOnce((() => ({
      promise: Promise.reject(new Error('解析失败')),
    })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解析失败'))
  })

  it('缩略图渲染中显示进度', async () => {
    let releasePage!: (page: unknown) => void
    mockGetPage.mockImplementationOnce(
      (() =>
        new Promise<unknown>((resolve) => {
          releasePage = resolve
        })) as never,
    )
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    expect(screen.getByTestId('processing').textContent).toContain('1/3')
    await act(async () => {
      releasePage(makePage())
    })
    await waitFor(() => expect(screen.getAllByTestId('page-item')).toHaveLength(3))
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('勾选/取消勾选更新选中计数', async () => {
    await uploadAndRenderPages()
    const checks = screen.getAllByTestId('page-check') as HTMLInputElement[]
    fireEvent.click(checks[0])
    expect(screen.getByTestId('selected-count').textContent).toContain('1/3')
    expect(checks[0].checked).toBe(true)
    fireEvent.click(checks[0])
    expect(screen.getByTestId('selected-count').textContent).toContain('0/3')
    expect(checks[0].checked).toBe(false)
  })

  it('全选后删除按钮禁用并提示不能删空', async () => {
    await uploadAndRenderPages()
    fireEvent.click(screen.getByTestId('select-all'))
    expect(screen.getByTestId('selected-count').textContent).toContain('3/3')
    const del = screen.getByTestId('delete') as HTMLButtonElement
    expect(del.disabled).toBe(true)
    expect(screen.getByTestId('delete-hint').textContent).toContain('至少保留 1 页')
  })

  it('反选', async () => {
    await uploadAndRenderPages()
    const checks = screen.getAllByTestId('page-check')
    fireEvent.click(checks[0])
    fireEvent.click(screen.getByTestId('invert'))
    expect(screen.getByTestId('selected-count').textContent).toContain('2/3')
  })

  it('按范围快速勾选', async () => {
    await uploadAndRenderPages()
    fireEvent.change(screen.getByTestId('range-input'), { target: { value: '2-3' } })
    fireEvent.click(screen.getByTestId('range-apply'))
    expect(screen.getByTestId('selected-count').textContent).toContain('2/3')
    expect(screen.queryByTestId('range-error')).toBeNull()
  })

  it('范围非法显示错误', async () => {
    await uploadAndRenderPages()
    fireEvent.change(screen.getByTestId('range-input'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByTestId('range-apply'))
    expect(screen.getByTestId('range-error')).toBeTruthy()
    // 选中态不变
    expect(screen.getByTestId('selected-count').textContent).toContain('0/3')
  })

  it('部分选中时删除按钮可用且无禁用提示', async () => {
    await uploadAndRenderPages()
    const checks = screen.getAllByTestId('page-check')
    fireEvent.click(checks[1])
    const del = screen.getByTestId('delete') as HTMLButtonElement
    expect(del.disabled).toBe(false)
    expect(screen.queryByTestId('delete-hint')).toBeNull()
  })

  it('删除选中页后生成新 PDF 并可下载', async () => {
    await uploadAndRenderPages()
    const checks = screen.getAllByTestId('page-check')
    fireEvent.click(checks[1])
    fireEvent.click(screen.getByTestId('delete'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 保留第 1、3 页 → copyPages 收到 0-based 索引 [0, 2]
    expect(mockCopyPages).toHaveBeenCalledWith(expect.anything(), [0, 2])
    expect(screen.getByTestId('result-info').textContent).toContain('已删除 1 页')
    expect(screen.getByTestId('result-info').textContent).toContain('保留 2 页')
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'report-deleted.pdf')
  })

  it('删除中显示 deleting 态', async () => {
    let releaseSave!: (v: Uint8Array) => void
    mockSave.mockImplementationOnce(
      () =>
        new Promise<Uint8Array>((resolve) => {
          releaseSave = resolve
        }),
    )
    await uploadAndRenderPages()
    fireEvent.click(screen.getAllByTestId('page-check')[0])
    fireEvent.click(screen.getByTestId('delete'))
    await waitFor(() => expect(screen.getByTestId('deleting')).toBeTruthy())
    await act(async () => {
      releaseSave(new Uint8Array([9]))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('deleting')).toBeNull()
  })

  it('删除失败显示错误', async () => {
    mockSave.mockRejectedValueOnce(new Error('生成失败'))
    await uploadAndRenderPages()
    fireEvent.click(screen.getAllByTestId('page-check')[0])
    fireEvent.click(screen.getByTestId('delete'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('生成失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('重置清空状态并释放 URL', async () => {
    await uploadAndRenderPages()
    fireEvent.click(screen.getAllByTestId('page-check')[0])
    fireEvent.click(screen.getByTestId('delete'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const revokedBefore = vi.mocked(URL.revokeObjectURL).mock.calls.length
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('page-item')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    // 3 张缩略图 + 1 个结果 URL 被释放
    expect(vi.mocked(URL.revokeObjectURL).mock.calls.length).toBeGreaterThan(revokedBefore)
  })

  it('重新上传释放旧缩略图 URL', async () => {
    render(<Tool />)
    await upload(makePdfFile('a.pdf'))
    await waitFor(() => expect(screen.getAllByTestId('page-item')).toHaveLength(3))
    const revokedBefore = vi.mocked(URL.revokeObjectURL).mock.calls.length
    await upload(makePdfFile('b.pdf'))
    await waitFor(() => expect(screen.getAllByTestId('page-item')).toHaveLength(3))
    expect(vi.mocked(URL.revokeObjectURL).mock.calls.length).toBeGreaterThan(revokedBefore)
  })

  it(`页数超过 ${MANY_PAGES_WARN} 显示性能提示`, async () => {
    mockGetDocument.mockImplementationOnce((() => ({
      promise: Promise.resolve(mockDocWithPages(101)),
    })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('perf-warn')).toBeTruthy())
    expect(screen.getByTestId('perf-warn').textContent).toContain('101')
    expect(screen.getAllByTestId('page-item')).toHaveLength(101)
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
    await waitFor(() => expect(screen.getAllByTestId('page-item')).toHaveLength(3))
  })

  it('无文件时 change 不处理（空数组与 null）', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    fireEvent.change(input, { target: { files: null } })
    expect(mockGetDocument).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
  })
})
