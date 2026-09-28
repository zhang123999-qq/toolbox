// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfjsLib from 'pdfjs-dist'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {} as Record<string, string>,
  getDocument: vi.fn(),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import { downloadBlob } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)
const mockGetDocument = vi.mocked(pdfjsLib.getDocument)

afterEach(() => {
  cleanup()
})

/** 文本项：str, x, y, width, hasEOL */
const tx = (str: string, x = 0, y = 100, w = 10, hasEOL = false) => ({
  str,
  hasEOL,
  transform: [1, 0, 0, 1, x, y],
  width: w,
})

const textContent = (items: unknown[]) => ({ items, styles: {}, lang: null })

const mockGetPage = vi.fn()

/** 配置 getDocument 返回 numPages 页、每页文本项为 pagesItems[n-1] 的文档 */
function docResolved(numPages: number, pagesItems: unknown[][]) {
  mockGetPage.mockImplementation(async (n: number) => ({
    getTextContent: vi.fn(async () => textContent(pagesItems[n - 1] ?? [])),
  }))
  mockGetDocument.mockImplementation((() => ({
    promise: Promise.resolve({ numPages, getPage: mockGetPage }),
  })) as never)
}

function makePdfFile(name = 'report.pdf', size = 1024) {
  const head = new TextEncoder().encode('%PDF-1.4\n')
  const bytes = new Uint8Array(Math.max(head.length, size))
  bytes.set(head)
  return new File([bytes], name, { type: 'application/pdf' })
}

function makeTextFile() {
  return new File(['hello world'], 'a.txt', { type: 'text/plain' })
}

function makeOversizePdfFile() {
  const f = makePdfFile('big.pdf')
  Object.defineProperty(f, 'size', { value: MAX_FILE_SIZE + 1 })
  return f
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
  // 默认文档：2 页，第 1 页 "Hello World"，第 2 页空文本
  docResolved(2, [[tx('Hello', 0, 100, 30), tx('World', 40, 100, 30)], []])
})

describe('pdf-to-text 组件', () => {
  it('渲染投放区（label 包裹文件输入）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('上传 PDF 后逐页提取并显示结果', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getAllByTestId('page-block')).toHaveLength(2)
    expect(screen.getByTestId('page-text').textContent).toBe('Hello World')
    // 第 2 页空文本 → 占位
    expect(screen.getByTestId('empty-page')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('copy')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
    expect(mockGetDocument).toHaveBeenCalled()
  })

  it('提取中显示逐页进度', async () => {
    let release!: (v: unknown) => void
    const gate = new Promise<unknown>((res) => {
      release = res
    })
    mockGetPage.mockImplementation(async (n: number) => ({
      getTextContent: n === 1 ? () => gate : async () => textContent([]),
    }))
    mockGetDocument.mockImplementation((() => ({
      promise: Promise.resolve({ numPages: 2, getPage: mockGetPage }),
    })) as never)
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePdfFile()] } })
    })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    // i18n 键尚未合并，只断言进度数字结构
    expect(screen.getByTestId('processing').textContent).toContain('1/2')
    await act(async () => {
      release(textContent([tx('a')]))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('非 PDF 文件显示错误', async () => {
    render(<Tool />)
    await upload(makeTextFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    await upload(makeOversizePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('加密 PDF 显示明确的加密错误', async () => {
    const err = new Error('No password given')
    err.name = 'PasswordException'
    mockGetDocument.mockImplementation((() => ({ promise: Promise.reject(err) })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('损坏 PDF 显示错误', async () => {
    mockGetDocument.mockImplementation((() => ({
      promise: Promise.reject(new Error('Invalid PDF structure')),
    })) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('整篇无文本时显示空状态且不渲染下载按钮', async () => {
    docResolved(2, [[], []])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('empty-result')).toBeTruthy())
    expect(screen.queryByTestId('download')).toBeNull()
    expect(screen.queryByTestId('page-block')).toBeNull()
  })

  it('复制成功显示已复制', async () => {
    const writeText = vi.fn(async (text: string) => text)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    try {
      render(<Tool />)
      await upload(makePdfFile())
      await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
      fireEvent.click(screen.getByTestId('copy'))
      await waitFor(() => expect(screen.getByTestId('copied')).toBeTruthy())
      expect(writeText).toHaveBeenCalled()
      expect(String(writeText.mock.calls[0][0])).toContain('Hello World')
    } finally {
      delete (navigator as unknown as Record<string, unknown>).clipboard
    }
  })

  it('剪贴板不可用时复制报错', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('copied')).toBeNull()
  })

  it('复制被拒绝时显示错误', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('Denied')
    })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    try {
      render(<Tool />)
      await upload(makePdfFile())
      await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
      fireEvent.click(screen.getByTestId('copy'))
      await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    } finally {
      delete (navigator as unknown as Record<string, unknown>).clipboard
    }
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('report-text.txt')
    await expect((blob as Blob).text()).resolves.toContain('Hello World')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makePdfFile())
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
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } })
      fireEvent.change(input, { target: { files: null } })
    })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })
})
