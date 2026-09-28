// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('pdf-lib', () => ({
  PDFDocument: { create: vi.fn() },
}))

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(),
}))

import { PDFDocument } from 'pdf-lib'
import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCreate = vi.mocked(PDFDocument.create)
const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

let mockDrawImage: ReturnType<typeof vi.fn>
let mockEmbedJpg: ReturnType<typeof vi.fn>
let mockEmbedPng: ReturnType<typeof vi.fn>
let mockAddPage: ReturnType<typeof vi.fn>

afterEach(() => {
  cleanup()
})

function makeFile(name = 'photo.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function upload(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

function fileNames() {
  return screen.getAllByTestId('file-item').map((el) => el.textContent ?? '')
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => ({}) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['png'], { type: 'image/png' }))
  mockDrawImage = vi.fn()
  mockEmbedJpg = vi.fn(async () => ({}))
  mockEmbedPng = vi.fn(async () => ({}))
  mockAddPage = vi.fn(() => ({ drawImage: mockDrawImage }))
  mockCreate.mockImplementation(
    async () =>
      ({
        embedJpg: mockEmbedJpg,
        embedPng: mockEmbedPng,
        addPage: mockAddPage,
        save: vi.fn(async () => new Uint8Array([1, 2, 3])),
      }) as never,
  )
})

describe('image-to-pdf 组件', () => {
  it('渲染投放区、选项、空列表提示与生成按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-pagesize')).toBeTruthy()
    expect(screen.getByTestId('opt-margin')).toBeTruthy()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
    expect(screen.getByTestId('generate')).toBeTruthy()
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('上传多张图片后显示文件列表与排序按钮', async () => {
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.jpg', 'image/jpeg')])
    const items = screen.getAllByTestId('file-item')
    expect(items).toHaveLength(2)
    expect(screen.getByTestId('file-list')).toBeTruthy()
    expect(screen.queryByTestId('empty-hint')).toBeNull()
    expect(fileNames()[0]).toContain('a.png')
    expect(fileNames()[1]).toContain('b.jpg')
    // 每项都有上移/下移/删除按钮；首项上移、末项下移禁用
    expect(items[0].querySelectorAll('[data-testid="move-up"]')).toHaveLength(1)
    expect(items[0].querySelectorAll('[data-testid="move-down"]')).toHaveLength(1)
    expect(items[0].querySelectorAll('[data-testid="remove"]')).toHaveLength(1)
    const firstUp = items[0].querySelector('[data-testid="move-up"]') as HTMLButtonElement
    const lastDown = items[1].querySelector('[data-testid="move-down"]') as HTMLButtonElement
    expect(firstUp.disabled).toBe(true)
    expect(lastDown.disabled).toBe(true)
  })

  it('上传非图片显示错误且不加入列表', async () => {
    render(<Tool />)
    await upload([makeFile('a.txt', 'text/plain')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('a.txt')
    expect(screen.queryByTestId('file-list')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    const big = makeFile('big.png', 'image/png', 10)
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload([big])
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(screen.queryByTestId('file-list')).toBeNull()
  })

  it('无文件时 change 不处理（空数组与 null）', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    fireEvent.change(input, { target: { files: null } })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
  })

  it('上移/下移调整图片顺序', async () => {
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.png'), makeFile('c.png')])
    const items = () => screen.getAllByTestId('file-item')
    // 第二项上移 → b,a,c
    fireEvent.click(items()[1].querySelector('[data-testid="move-up"]') as HTMLElement)
    expect(fileNames()[0]).toContain('b.png')
    expect(fileNames()[1]).toContain('a.png')
    // 第一项下移 → a,b,c
    fireEvent.click(items()[0].querySelector('[data-testid="move-down"]') as HTMLElement)
    expect(fileNames()[0]).toContain('a.png')
    expect(fileNames()[1]).toContain('b.png')
    expect(fileNames()[2]).toContain('c.png')
  })

  it('删除文件', async () => {
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.png')])
    fireEvent.click(
      screen.getAllByTestId('file-item')[0].querySelector('[data-testid="remove"]') as HTMLElement,
    )
    const items = screen.getAllByTestId('file-item')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('b.png')
  })

  it('清空重置状态，之后可重新上传', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
    await upload([makeFile('b.png')])
    expect(screen.getAllByTestId('file-item')).toHaveLength(1)
  })

  it('空列表点击生成不做任何事', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('生成 PDF：三种图片分别走 jpg/png/convert 嵌入', async () => {
    render(<Tool />)
    await upload([
      makeFile('a.jpg', 'image/jpeg'),
      makeFile('b.png', 'image/png'),
      makeFile('c.webp', 'image/webp'),
    ])
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCreate).toHaveBeenCalled()
    // jpg 直接嵌入 1 次；png 直接嵌入 + webp 转 PNG 嵌入共 2 次
    expect(mockEmbedJpg).toHaveBeenCalledTimes(1)
    expect(mockEmbedJpg.mock.calls[0][0]).toBeInstanceOf(Uint8Array)
    expect(mockEmbedPng).toHaveBeenCalledTimes(2)
    expect(mockDrawScaled).toHaveBeenCalledTimes(1)
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(1)
    // 每图一页：fit 模式无边距 → 页面 800x600
    expect(mockAddPage).toHaveBeenCalledTimes(3)
    expect(mockAddPage.mock.calls[0][0]).toEqual([800, 600])
    expect(mockDrawImage).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('result-info')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('页边距非法时生成报错', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-margin'), { target: { value: '999' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('PDF 生成失败显示错误', async () => {
    mockCreate.mockRejectedValueOnce(new Error('PDF 失败'))
    render(<Tool />)
    await upload([makeFile('a.png')])
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('PDF 失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('生成中显示 loading 态', async () => {
    mockCreate.mockImplementation(() => new Promise(() => {}))
    render(<Tool />)
    await upload([makeFile('a.png')])
    fireEvent.click(screen.getByTestId('generate'))
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
  })

  it('下载按钮调用 downloadBlob，文件名为首图加后缀', async () => {
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.png')])
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect((blob as Blob).type).toBe('application/pdf')
    expect(name).toBe('a-merged.pdf')
  })

  it('生成后删除全部文件，清空按钮仍可见并可清除结果', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(
      screen.getAllByTestId('file-item')[0].querySelector('[data-testid="remove"]') as HTMLElement,
    )
    expect(screen.queryByTestId('file-list')).toBeNull()
    // 文件已空但结果仍在 → 清空按钮仍可见
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('选项变更更新状态', async () => {
    render(<Tool />)
    const select = screen.getByTestId('opt-pagesize') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'a4' } })
    expect(select.value).toBe('a4')
    const margin = screen.getByTestId('opt-margin') as HTMLInputElement
    await act(async () => {
      fireEvent.change(margin, { target: { value: '10' } })
    })
    expect(margin.value).toBe('10')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makeFile('d.png')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('file-list')).toBeTruthy())
  })

  it('投放区为 label 且包含多选文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.multiple).toBe(true)
  })
})
