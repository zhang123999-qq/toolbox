// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { zh } from '../../i18n/messages.zh'
import { en } from '../../i18n/messages.en'

vi.mock('pdf-lib', () => ({
  PDFDocument: { load: vi.fn(), create: vi.fn() },
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockLoad = vi.mocked(PDFDocument.load)
const mockCreate = vi.mocked(PDFDocument.create)
const mockDownloadBlob = vi.mocked(downloadBlob)

// pdfSplit 的 i18n key 尚未合入 messages.zh/en（由协调员统一合并），
// 此处按 pdf-split.i18n.json 的真实文案注入，保证测试走真实翻译路径（不 mock i18n）。
const ZH_KEYS: Record<string, string> = {
  'pdfSplit.note': '本地拆分 PDF：按页范围、每 N 页或单页逐个拆成多个文件，全程不上传',
  'pdfSplit.dropHint': '点击选择 PDF 文件，或拖拽到此处（.pdf，≤50MB）',
  'pdfSplit.mode': '拆分模式',
  'pdfSplit.modeRanges': '按页范围',
  'pdfSplit.modeChunks': '每 N 页',
  'pdfSplit.modeSingle': '单页逐个',
  'pdfSplit.pages': '页范围',
  'pdfSplit.pagesHint': '如 1-3,5,8-10',
  'pdfSplit.chunkSize': '每份页数',
  'pdfSplit.reset': '重新选择',
  'pdfSplit.processing': '正在拆分…',
  'pdfSplit.resultsTitle': '拆分结果（共 {count} 个文件）',
  'pdfSplit.pageOne': '第 {page} 页',
  'pdfSplit.pageRange': '第 {start}–{end} 页（共 {count} 页）',
  'pdfSplit.download': '下载',
  'pdfSplit.error.unsupported': '不是有效的 PDF 文件',
}
const EN_KEYS: Record<string, string> = {
  'pdfSplit.note': 'Split PDF locally...',
  'pdfSplit.dropHint': 'Click to choose a PDF file, or drag it here (.pdf, ≤50MB)',
  'pdfSplit.mode': 'Split mode',
  'pdfSplit.modeRanges': 'By page ranges',
  'pdfSplit.modeChunks': 'Every N pages',
  'pdfSplit.modeSingle': 'Page by page',
  'pdfSplit.pages': 'Page ranges',
  'pdfSplit.pagesHint': 'e.g. 1-3,5,8-10',
  'pdfSplit.chunkSize': 'Pages per file',
  'pdfSplit.reset': 'Choose again',
  'pdfSplit.processing': 'Splitting…',
  'pdfSplit.resultsTitle': 'Split results ({count} files)',
  'pdfSplit.pageOne': 'Page {page}',
  'pdfSplit.pageRange': 'Pages {start}–{end} ({count} pages)',
  'pdfSplit.download': 'Download',
  'pdfSplit.error.unsupported': 'Not a valid PDF file',
}

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'doc.pdf', size = 64) {
  const bytes = new Uint8Array(size)
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-
  return new File([bytes], name, { type: 'application/pdf' })
}

function makeNonPdfFile() {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]) // PNG 魔数
  return new File([bytes], 'a.png', { type: 'image/png' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

function mockPdfLib(totalPages = 10) {
  mockLoad.mockImplementation(async () => ({ getPageCount: () => totalPages }) as never)
  mockCreate.mockImplementation(
    async () =>
      ({
        copyPages: vi.fn(async (_src: unknown, indices: number[]) =>
          indices.map((i) => ({ page: i })),
        ),
        addPage: vi.fn(),
        save: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
      }) as never,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  Object.assign(zh, ZH_KEYS)
  Object.assign(en, EN_KEYS)
  mockPdfLib(10)
})

describe('pdf-split 组件', () => {
  it('渲染投放区与模式选择（默认按页范围）', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-mode')).toBeTruthy()
    expect(screen.getByTestId('opt-pages')).toBeTruthy()
    expect(screen.queryByTestId('opt-chunk')).toBeNull()
  })

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toContain('application/pdf')
  })

  it('切换模式显示对应输入', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'chunks' } })
    expect(screen.getByTestId('opt-chunk')).toBeTruthy()
    expect(screen.queryByTestId('opt-pages')).toBeNull()
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'single' } })
    expect(screen.queryByTestId('opt-chunk')).toBeNull()
    expect(screen.queryByTestId('opt-pages')).toBeNull()
  })

  it('按页范围拆分：每个片段独立文件与下载', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1-3,5' } })
    await upload(makePdfFile())
    const rows = await screen.findAllByTestId('split-result')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('1')
    expect(rows[0].textContent).toContain('3')
    expect(rows[1].textContent).toContain('5')
    const buttons = screen.getAllByTestId('download-file')
    expect(buttons).toHaveLength(2)
    fireEvent.click(buttons[0])
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('doc-p1-3.pdf')
    fireEvent.click(buttons[1])
    expect(mockDownloadBlob.mock.calls[1][1]).toBe('doc-p5.pdf')
  })

  it('每 N 页拆分：10 页每 4 页 → 3 个文件', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'chunks' } })
    fireEvent.change(screen.getByTestId('opt-chunk'), { target: { value: '4' } })
    await upload(makePdfFile())
    const rows = await screen.findAllByTestId('split-result')
    expect(rows).toHaveLength(3)
    fireEvent.click(screen.getAllByTestId('download-file')[2])
    expect(mockDownloadBlob.mock.calls[0][1]).toBe('doc-p9-10.pdf')
  })

  it('单页逐个拆分：每页一个文件', async () => {
    mockPdfLib(3)
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'single' } })
    await upload(makePdfFile())
    const rows = await screen.findAllByTestId('split-result')
    expect(rows).toHaveLength(3)
    expect(rows[0].textContent).toContain('1')
  })

  it('上传非 PDF 显示错误且无下载按钮', async () => {
    render(<Tool />)
    await upload(makeNonPdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不是有效的 PDF')
    expect(screen.queryByTestId('split-result')).toBeNull()
    expect(screen.queryByTestId('download-file')).toBeNull()
  })

  it('页范围非法时明确报错', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '5-3' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('倒置'))
    expect(screen.queryByTestId('split-result')).toBeNull()
  })

  it('页码超范围时明确报错', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1-99' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('超出范围'))
  })

  it('加密 PDF 明确报错', async () => {
    mockLoad.mockRejectedValueOnce(
      new Error(
        'Input document to `PDFDocument.load` is encrypted. You can use `PDFDocument.load(..., { ignoreEncryption: true })` if you wish to load the document anyways.',
      ),
    )
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1-2' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('已加密'))
    expect(screen.queryByTestId('split-result')).toBeNull()
  })

  it('每份页数非法时报错（type=number 用 0 触发）', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'chunks' } })
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-chunk'), { target: { value: '0' } })
    })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('每份页数'))
  })

  it('处理中显示 loading', async () => {
    let release!: (doc: unknown) => void
    mockLoad.mockImplementationOnce(
      () =>
        new Promise<unknown>((resolve) => {
          release = resolve
        }) as never,
    )
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1-2' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      release({ getPageCount: () => 10 })
    })
    await waitFor(() => expect(screen.getAllByTestId('split-result')).toHaveLength(1))
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('有文件时选项变更触发重新处理', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1-2' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getAllByTestId('split-result')).toHaveLength(1))
    const calls = mockLoad.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'single' } })
    await waitFor(() => expect(mockLoad.mock.calls.length).toBeGreaterThan(calls))
    await waitFor(() => expect(screen.getAllByTestId('split-result')).toHaveLength(10))
  })

  it('无文件时选项变更不处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'single' } })
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('重置清空状态与下载按钮', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1-2' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('split-result')).toBeTruthy())
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('split-result')).toBeNull()
    expect(screen.queryByTestId('download-file')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1-2' } })
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('split-result')).toBeTruthy())
  })
})
