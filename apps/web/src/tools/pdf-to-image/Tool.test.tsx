// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pdfjsLib from 'pdfjs-dist'
import Tool from './Tool'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {} as Record<string, string>,
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

const mockRender = vi.fn()
const makePage = () => ({
  getViewport: ({ scale }: { scale: number }) => ({ width: 120 * scale, height: 160 * scale }),
  render: mockRender,
})
const mockGetPage = vi.fn(async (_n: number) => makePage())
const mockDoc = { numPages: 3, getPage: mockGetPage }

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockRender.mockImplementation(() => ({ promise: Promise.resolve() }))
  mockGetPage.mockImplementation(async () => makePage())
  mockGetDocument.mockImplementation((() => ({ promise: Promise.resolve(mockDoc) })) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['p'], { type: 'image/png' }))
})

afterEach(() => {
  cleanup()
})

function makeFile(name = 'report.pdf', type = 'application/pdf', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

describe('pdf-to-image 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-dpi')).toBeTruthy()
    expect(screen.getByTestId('opt-pages')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
  })

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toContain('application/pdf')
  })

  it('上传合法 PDF 后渲染多页结果', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
    expect(screen.getAllByTestId('download-page')).toHaveLength(3)
    expect(mockGetDocument).toHaveBeenCalled()
    expect(mockGetPage.mock.calls.map((c) => c[0])).toEqual([1, 2, 3])
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('渲染中显示进度', async () => {
    let release!: (page: unknown) => void
    mockGetPage.mockImplementationOnce(
      (() =>
        new Promise<unknown>((resolve) => {
          release = resolve
        })) as never,
    )
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    expect(screen.getByTestId('processing').textContent).toContain('1/3')
    await act(async () => {
      release(makePage())
    })
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('上传非 PDF 显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('page-result')).toBeNull()
  })

  it('页码非法时显示错误', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: 'abc' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('页码超范围时显示错误', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '9' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('范围倒置时显示错误', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '3-1' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('PDF 解析失败显示错误', async () => {
    mockGetDocument.mockImplementationOnce((() => ({
      promise: Promise.reject(new Error('解析失败')),
    })) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解析失败'))
  })

  it('渲染尺寸超限时显示错误', async () => {
    mockGetPage.mockImplementationOnce(async () => ({
      getViewport: () => ({ width: 20000, height: 20000 }),
      render: mockRender,
    }))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('过大'))
  })

  it('指定页码只渲染所选页', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1,3' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(2))
    expect(mockGetPage.mock.calls.map((c) => c[0])).toEqual([1, 3])
  })

  it('空名文件下载名兜底为 pdf', async () => {
    render(<Tool />)
    await upload(makeFile('.pdf'))
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
    fireEvent.click(screen.getAllByTestId('download-page')[0])
    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'pdf-p1.png')
  })

  it('每页独立下载按钮', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
    const buttons = screen.getAllByTestId('download-page')
    fireEvent.click(buttons[0])
    fireEvent.click(buttons[1])
    expect(mockDownloadBlob).toHaveBeenCalledTimes(2)
    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'report-p1.png')
    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'report-p2.png')
  })

  it('JPEG 格式输出 jpg 并按 image/jpeg 编码', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
    expect(mockCanvasToBlob).toHaveBeenCalledWith(expect.anything(), 'image/jpeg')
    fireEvent.click(screen.getAllByTestId('download-page')[0])
    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'report-p1.jpg')
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
    const calls = mockGetDocument.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-dpi'), { target: { value: '300' } })
    await waitFor(() => expect(mockGetDocument.mock.calls.length).toBeGreaterThan(calls))
  })

  it('无文件时选项变更不处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1' } })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('page-result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
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
    await waitFor(() => expect(screen.getAllByTestId('page-result')).toHaveLength(3))
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })
})
