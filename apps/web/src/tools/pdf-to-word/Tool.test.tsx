// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { zh } from '../../i18n/messages.zh'
import { en } from '../../i18n/messages.en'

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

vi.mock('docx', () => ({
  Document: vi.fn(),
  Packer: { toBlob: vi.fn() },
  PageBreak: vi.fn(),
  Paragraph: vi.fn(),
  TextRun: vi.fn(),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import { PasswordException, PasswordResponses, getDocument } from 'pdfjs-dist'
import { Document, Packer, PageBreak, Paragraph, TextRun } from 'docx'
import { downloadBlob } from '../../lib/image'

const mockGetDocument = vi.mocked(getDocument)
const mockDocument = vi.mocked(Document)
const mockPackerToBlob = vi.mocked(Packer.toBlob)
const mockPageBreak = vi.mocked(PageBreak)
const mockParagraph = vi.mocked(Paragraph)
const mockTextRun = vi.mocked(TextRun)
const mockDownloadBlob = vi.mocked(downloadBlob)

// pdfToWord 的 i18n key 尚未合入 messages.zh/en（由协调员统一合并），
// 此处按 pdf-to-word.i18n.json 的真实文案注入，保证测试走真实翻译路径（不 mock i18n）。
const ZH_KEYS: Record<string, string> = {
  'pdfToWord.note':
    '将 PDF 文档转换为 Word（.docx）：逐页提取文本内容，每页文本生成段落、页间自动分页，全程本地处理，不上传。',
  'pdfToWord.fidelityNote': '保真度说明：仅提取文本内容生成 Word，不保留原排版、图片与表格。',
  'pdfToWord.dropHint': '点击选择 PDF 文件，或拖拽到此处（.pdf，≤50MB）',
  'pdfToWord.reset': '重新选择',
  'pdfToWord.converting': '正在转换',
  'pdfToWord.pageUnit': '页',
  'pdfToWord.resultInfo': '转换完成',
  'pdfToWord.download': '下载 Word 文档',
  'pdfToWord.error.unsupported': '不是有效的 PDF 文件',
  'pdfToWord.error.encrypted': 'PDF 已加密，不支持转换',
}
const EN_KEYS: Record<string, string> = {
  'pdfToWord.note':
    'Convert a PDF document to Word (.docx): extract text page by page into paragraphs with automatic page breaks. All processing is local — nothing is uploaded.',
  'pdfToWord.fidelityNote':
    'Fidelity note: only text content is extracted; original layout, images and tables are not preserved.',
  'pdfToWord.dropHint': 'Click to choose a PDF file, or drag it here (.pdf, ≤50MB)',
  'pdfToWord.reset': 'Choose again',
  'pdfToWord.converting': 'Converting',
  'pdfToWord.pageUnit': 'pages',
  'pdfToWord.resultInfo': 'Conversion complete',
  'pdfToWord.download': 'Download Word document',
  'pdfToWord.error.unsupported': 'Not a valid PDF file',
  'pdfToWord.error.encrypted': 'PDF is encrypted and cannot be converted',
}

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

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** 模拟 pdfjs：pages[i] 为第 i+1 页的文本行数组 */
function mockPdfPages(pages: string[][]) {
  mockGetDocument.mockImplementation(
    () =>
      ({
        promise: Promise.resolve({
          numPages: pages.length,
          getPage: (n: number) =>
            Promise.resolve({
              getTextContent: () =>
                Promise.resolve({
                  items: pages[n - 1].flatMap((line) => [{ str: line, hasEOL: true }]),
                }),
            }),
        }),
      }) as never,
  )
}

const DOCX_BLOB = () =>
  new Blob(['fake-docx'], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  Object.assign(zh, ZH_KEYS)
  Object.assign(en, EN_KEYS)
  mockPackerToBlob.mockResolvedValue(DOCX_BLOB())
  mockPdfPages([['第一页行1', '第一页行2'], ['第二页行1']])
})

describe('pdf-to-word 组件', () => {
  it('渲染投放区与说明文案', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByText(/全程本地处理，不上传/)).toBeTruthy()
    expect(screen.getByText(/保真度说明/)).toBeTruthy()
  })

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toContain('application/pdf')
  })

  it('上传 PDF 后生成 docx 并显示结果', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockGetDocument).toHaveBeenCalled()
    // 文本行 → TextRun：第一页 2 行 + 第二页 1 行
    expect(mockTextRun.mock.calls.map((c) => c[0])).toEqual(['第一页行1', '第一页行2', '第二页行1'])
    // 段落：3 行 + 1 个分页符段落
    expect(mockParagraph).toHaveBeenCalledTimes(4)
    expect(mockPageBreak).toHaveBeenCalledTimes(1)
    // Document 构造参数包含 sections/children
    expect(mockDocument).toHaveBeenCalledTimes(1)
    const docArg = mockDocument.mock.calls[0][0] as {
      sections: { children: unknown[] }[]
    }
    expect(docArg.sections).toHaveLength(1)
    expect(docArg.sections[0].children).toHaveLength(4)
    expect(mockPackerToBlob).toHaveBeenCalledTimes(1)
    // 结果信息：页数与输出文件名
    expect(screen.getByTestId('result-info').textContent).toContain('2')
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('空页保留空段落占位（TextRun 收到空字符串）', async () => {
    mockPdfPages([['有文本'], []])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockTextRun.mock.calls.map((c) => c[0])).toEqual(['有文本', ''])
    expect(mockParagraph).toHaveBeenCalledTimes(3) // 文本段 + 分页段 + 空占位段
    expect(mockPageBreak).toHaveBeenCalledTimes(1)
  })

  it('下载按钮调用 downloadBlob，文件名为 -converted.docx', async () => {
    render(<Tool />)
    await upload(makePdfFile('report.pdf'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toBe('report-converted.docx')
  })

  it('上传非 PDF 显示错误且无结果', async () => {
    render(<Tool />)
    await upload(makeNonPdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不是有效的 PDF 文件')
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
    expect(screen.getByTestId('error').textContent).toContain('文件过大')
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
    expect(screen.getByTestId('error').textContent).toContain('已加密')
    expect(screen.queryByTestId('result')).toBeNull()
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
    expect(screen.getByTestId('processing').textContent).toContain('正在转换')
    await act(async () => {
      release({
        numPages: 2,
        getPage: (n: number) =>
          Promise.resolve({
            getTextContent: () => Promise.resolve({ items: [{ str: `p${n}`, hasEOL: true }] }),
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
})
