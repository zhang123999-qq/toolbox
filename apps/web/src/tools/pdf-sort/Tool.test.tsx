// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('pdf-lib', () => ({
  PDFDocument: { create: vi.fn(), load: vi.fn() },
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockCreate = vi.mocked(PDFDocument.create)
const mockLoad = vi.mocked(PDFDocument.load)
const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

/** 带 %PDF- 魔数的假 PDF 文件 */
function makePdfFile(name = 'a.pdf', size = 1024) {
  const bytes = new Uint8Array(size)
  bytes[0] = 0x25
  bytes[1] = 0x50
  bytes[2] = 0x44
  bytes[3] = 0x46
  bytes[4] = 0x2d
  return new File([bytes], name, { type: 'application/pdf' })
}

/** 无魔数的普通文件 */
function makeNonPdfFile(name = 'a.txt') {
  return new File(['hello world'], name, { type: 'text/plain' })
}

/** 假 pdf-lib 文档：pageCount 页，每页尺寸递增 */
function fakeDoc(pageCount: number) {
  return {
    getPageCount: () => pageCount,
    getPages: () =>
      Array.from({ length: pageCount }, (_, i) => ({
        getSize: () => ({ width: 100 + i, height: 200 + i }),
      })),
  }
}

let copyPagesMock: ReturnType<typeof vi.fn>

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** 页面列表当前显示的原页码顺序 */
function pageNumbers() {
  return screen
    .getAllByTestId('page-item')
    .map((el) => el.querySelector('[data-testid="page-number"]')?.textContent ?? '')
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockLoad.mockImplementation(async () => fakeDoc(3) as never)
  mockCreate.mockImplementation(
    async () =>
      ({
        copyPages: (copyPagesMock = vi.fn(async (_src: unknown, order: number[]) =>
          order.map((i) => ({ page: i })),
        )),
        addPage: vi.fn(),
        save: vi.fn(async () => new Uint8Array([1, 2, 3])),
      }) as never,
  )
})

describe('pdf-sort 组件', () => {
  it('渲染投放区与空提示', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
    expect(screen.queryByTestId('page-list')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('投放区为 label 且包含 PDF 文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toContain('application/pdf')
  })

  it('上传合法 PDF 后显示页面列表与尺寸', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    const items = screen.getAllByTestId('page-item')
    expect(items).toHaveLength(3)
    expect(screen.getByTestId('page-list')).toBeTruthy()
    expect(screen.queryByTestId('empty-hint')).toBeNull()
    // 键未合并前 t() 返回空，页码仅显示数字；合并后为"第 n 页"——数字断言两种状态都成立
    expect(pageNumbers()[0]).toContain('1')
    expect(pageNumbers()[1]).toContain('2')
    expect(pageNumbers()[2]).toContain('3')
    // 尺寸文本走纯函数，不依赖 i18n
    expect(items[0].querySelector('[data-testid="page-size"]')?.textContent).toContain('100×200')
    // 首项上移、末项下移禁用
    const firstUp = items[0].querySelector('[data-testid="move-up"]') as HTMLButtonElement
    const lastDown = items[2].querySelector('[data-testid="move-down"]') as HTMLButtonElement
    expect(firstUp.disabled).toBe(true)
    expect(lastDown.disabled).toBe(true)
  })

  it('上移/下移调整页面顺序', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    const items = () => screen.getAllByTestId('page-item')
    fireEvent.click(items()[0].querySelector('[data-testid="move-down"]') as HTMLElement)
    expect(pageNumbers().map((s) => s.replace(/\D/g, ''))).toEqual(['2', '1', '3'])
    fireEvent.click(items()[1].querySelector('[data-testid="move-up"]') as HTMLElement)
    expect(pageNumbers().map((s) => s.replace(/\D/g, ''))).toEqual(['1', '2', '3'])
  })

  it('反转顺序', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    fireEvent.click(screen.getByTestId('reverse'))
    expect(pageNumbers().map((s) => s.replace(/\D/g, ''))).toEqual(['3', '2', '1'])
  })

  it('重置顺序恢复初始排列', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    fireEvent.click(screen.getByTestId('reverse'))
    expect(pageNumbers().map((s) => s.replace(/\D/g, ''))).toEqual(['3', '2', '1'])
    fireEvent.click(screen.getByTestId('reset-order'))
    expect(pageNumbers().map((s) => s.replace(/\D/g, ''))).toEqual(['1', '2', '3'])
  })

  it('生成成功：按当前顺序 copyPages 并显示结果', async () => {
    render(<Tool />)
    await upload(makePdfFile('doc.pdf'))
    fireEvent.click(screen.getByTestId('reverse'))
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(copyPagesMock).toHaveBeenCalledWith(expect.anything(), [2, 1, 0])
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('下载按钮调用 downloadBlob，文件名加 -sorted 后缀', async () => {
    render(<Tool />)
    await upload(makePdfFile('report.pdf'))
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect((blob as Blob).type).toBe('application/pdf')
    expect(name).toBe('report-sorted.pdf')
  })

  it('生成中显示 loading 态且按钮禁用', async () => {
    mockCreate.mockImplementation(() => new Promise(() => {}))
    render(<Tool />)
    await upload(makePdfFile())
    fireEvent.click(screen.getByTestId('generate'))
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    expect((screen.getByTestId('generate') as HTMLButtonElement).disabled).toBe(true)
  })

  it('生成失败显示错误', async () => {
    mockCreate.mockRejectedValueOnce(new Error('save failed'))
    render(<Tool />)
    await upload(makePdfFile())
    await act(async () => {
      fireEvent.click(screen.getByTestId('generate'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传时显示 loading 态', async () => {
    let resolveLoad!: (doc: unknown) => void
    mockLoad.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveLoad = res as (doc: unknown) => void
        }),
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makePdfFile()] } })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      resolveLoad(fakeDoc(2))
    })
    await waitFor(() => expect(screen.queryByTestId('processing')).toBeNull())
    expect(screen.getAllByTestId('page-item')).toHaveLength(2)
  })

  it('非 PDF 文件上传报错', async () => {
    render(<Tool />)
    await upload(makeNonPdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('page-list')).toBeNull()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
  })

  it('加密 PDF 上传报错', async () => {
    mockLoad.mockRejectedValueOnce(new Error('Input document to PDFDocument.load is encrypted.'))
    render(<Tool />)
    await upload(makePdfFile('secret.pdf'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('page-list')).toBeNull()
  })

  it('损坏 PDF 上传报错', async () => {
    mockLoad.mockRejectedValueOnce(new Error('parse failed'))
    render(<Tool />)
    await upload(makePdfFile('broken.pdf'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('page-list')).toBeNull()
  })

  it('超大文件上传报错', async () => {
    const big = makePdfFile('big.pdf', 10)
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(big)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('页数超限上传报错', async () => {
    mockLoad.mockImplementationOnce(async () => fakeDoc(501) as never)
    render(<Tool />)
    await upload(makePdfFile('huge.pdf'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('page-list')).toBeNull()
  })

  it('清空重置状态，之后可重新上传', async () => {
    render(<Tool />)
    await upload(makePdfFile('a.pdf'))
    expect(screen.getByTestId('clear')).toBeTruthy()
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('page-list')).toBeNull()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
    expect(screen.queryByTestId('result')).toBeNull()
    await upload(makePdfFile('b.pdf'))
    expect(screen.getAllByTestId('page-item')).toHaveLength(3)
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    fireEvent.change(input, { target: { files: null } })
    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makePdfFile('d.pdf')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('page-list')).toBeTruthy())
  })
})
