// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('pdf-lib', () => ({
  PDFDocument: { load: vi.fn(), create: vi.fn() },
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockLoad = vi.mocked(PDFDocument.load)
const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'doc.pdf', size = 1000): File {
  // %PDF 魔数头，后面填充
  const head = new TextEncoder().encode('%PDF-1.4\n')
  const body = new Uint8Array(size)
  body.set(head, 0)
  return new File([body], name, { type: 'application/pdf' })
}

function makeNonPdfFile(): File {
  return new File([new Uint8Array([0x50, 0x4e, 0x47])], 'a.png', { type: 'image/png' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

function mockDoc(bytes: Uint8Array = new Uint8Array(500)) {
  return {
    setTitle: vi.fn(),
    setAuthor: vi.fn(),
    setSubject: vi.fn(),
    setKeywords: vi.fn(),
    setCreator: vi.fn(),
    setProducer: vi.fn(),
    getPageCount: () => 3,
    save: vi.fn(async () => bytes),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  const doc = mockDoc()
  mockLoad.mockImplementation(async () => doc as never)
})

describe('pdf-compress 组件', () => {
  it('渲染投放区、元数据选项与效果限制提示', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-metadata')).toBeTruthy()
    expect(screen.getByTestId('limit-note')).toBeTruthy()
  })

  it('投放区为 label 且只接受单 PDF 文件', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toBe('application/pdf')
    expect(input.multiple).toBe(false)
  })

  it('上传合法 PDF 后显示结果与统计', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoad).toHaveBeenCalled()
  })

  it('上传非 PDF 显示错误', async () => {
    render(<Tool />)
    await upload(makeNonPdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件显示错误且不调用 pdf-lib', async () => {
    const big = makePdfFile('big.pdf', 10)
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(big)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('加密 PDF 显示明确的加密错误', async () => {
    const err = new Error('Input document to `PDFDocument.load` is encrypted.')
    err.name = 'EncryptedPDFError'
    mockLoad.mockRejectedValueOnce(err)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('pdf-lib 解析失败显示错误', async () => {
    mockLoad.mockRejectedValueOnce(new Error('Failed to parse PDF document'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Failed to parse'),
    )
  })

  it('元数据选项勾选时调用清除方法', async () => {
    const doc = mockDoc()
    mockLoad.mockImplementation(async () => doc as never)
    render(<Tool />)
    // 默认已勾选：直接上传即触发清除
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(doc.setTitle).toHaveBeenCalledWith('')
    expect(doc.setAuthor).toHaveBeenCalledWith('')
    expect(doc.setKeywords).toHaveBeenCalledWith([])
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockLoad.mock.calls.length
    const checkbox = screen.getByTestId('opt-metadata') as HTMLInputElement
    await act(async () => {
      fireEvent.click(checkbox)
    })
    await waitFor(() => expect(mockLoad.mock.calls.length).toBeGreaterThan(calls))
    expect(checkbox.checked).toBe(false)
  })

  it('未上传文件时选项变更只更新状态不处理', () => {
    render(<Tool />)
    const checkbox = screen.getByTestId('opt-metadata') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('下载按钮调用 downloadBlob，文件名为 -compressed.pdf', async () => {
    render(<Tool />)
    await upload(makePdfFile('报告.pdf'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect((blob as Blob).type).toBe('application/pdf')
    expect(name).toBe('报告-compressed.pdf')
  })

  it('重置清空状态，之后可重新上传', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    await upload(makePdfFile('b.pdf'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
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
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })
})
