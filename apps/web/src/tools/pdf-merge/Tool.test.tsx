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

async function upload(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

function fileNames() {
  return screen.getAllByTestId('file-item').map((el) => el.textContent ?? '')
}

async function clickMerge() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('merge'))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockLoad.mockImplementation(
    async () => ({ getPageCount: () => 2, getPageIndices: () => [0] }) as never,
  )
  mockCreate.mockImplementation(
    async () =>
      ({
        copyPages: vi.fn(async () => [{}, {}]),
        addPage: vi.fn(),
        save: vi.fn(async () => new Uint8Array([1, 2, 3])),
      }) as never,
  )
})

describe('pdf-merge 组件', () => {
  it('渲染投放区、禁用合并按钮、空列表与数量提示', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    const merge = screen.getByTestId('merge') as HTMLButtonElement
    expect(merge.disabled).toBe(true)
    expect(screen.getByTestId('need-two')).toBeTruthy()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('clear')).toBeNull()
  })

  it('上传两个 PDF 后显示列表、页数与排序按钮', async () => {
    render(<Tool />)
    await upload([makePdfFile('a.pdf'), makePdfFile('b.pdf')])
    const items = screen.getAllByTestId('file-item')
    expect(items).toHaveLength(2)
    expect(screen.getByTestId('file-list')).toBeTruthy()
    expect(screen.queryByTestId('empty-hint')).toBeNull()
    expect(fileNames()[0]).toContain('a.pdf')
    expect(fileNames()[1]).toContain('b.pdf')
    // 每行显示页数
    expect(items[0].querySelector('[data-testid="page-count"]')?.textContent).toContain('2')
    // 合并按钮可用，数量提示消失
    expect((screen.getByTestId('merge') as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByTestId('need-two')).toBeNull()
    // 每项都有上移/下移/删除；首项上移、末项下移禁用
    const firstUp = items[0].querySelector('[data-testid="move-up"]') as HTMLButtonElement
    const lastDown = items[1].querySelector('[data-testid="move-down"]') as HTMLButtonElement
    expect(firstUp.disabled).toBe(true)
    expect(lastDown.disabled).toBe(true)
  })

  it('页数读取失败时显示占位符', async () => {
    mockLoad.mockRejectedValueOnce(new Error('解析失败'))
    render(<Tool />)
    await upload([makePdfFile('a.pdf')])
    const pageCount = screen
      .getAllByTestId('file-item')[0]
      .querySelector('[data-testid="page-count"]')?.textContent
    // 键未合并前 t() 返回空，合并后为占位符 ——— 两种状态都接受
    expect(['', '—']).toContain(pageCount ?? null)
  })

  it('上移/下移调整文件顺序', async () => {
    render(<Tool />)
    await upload([makePdfFile('a.pdf'), makePdfFile('b.pdf'), makePdfFile('c.pdf')])
    const items = () => screen.getAllByTestId('file-item')
    fireEvent.click(items()[1].querySelector('[data-testid="move-up"]') as HTMLElement)
    expect(fileNames()[0]).toContain('b.pdf')
    expect(fileNames()[1]).toContain('a.pdf')
    fireEvent.click(items()[0].querySelector('[data-testid="move-down"]') as HTMLElement)
    expect(fileNames()[0]).toContain('a.pdf')
    expect(fileNames()[1]).toContain('b.pdf')
    expect(fileNames()[2]).toContain('c.pdf')
  })

  it('删除文件', async () => {
    render(<Tool />)
    await upload([makePdfFile('a.pdf'), makePdfFile('b.pdf')])
    fireEvent.click(
      screen.getAllByTestId('file-item')[0].querySelector('[data-testid="remove"]') as HTMLElement,
    )
    const items = screen.getAllByTestId('file-item')
    expect(items).toHaveLength(1)
    expect(items[0].textContent).toContain('b.pdf')
    // 只剩 1 个文件，合并按钮重新禁用
    expect((screen.getByTestId('merge') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByTestId('need-two')).toBeTruthy()
  })

  it('清空重置状态，之后可重新上传', async () => {
    render(<Tool />)
    await upload([makePdfFile('a.pdf')])
    expect(screen.getByTestId('clear')).toBeTruthy()
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('clear')).toBeNull()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
    await upload([makePdfFile('b.pdf')])
    expect(screen.getAllByTestId('file-item')).toHaveLength(1)
  })

  it('无文件时 change 不处理（空数组与 null）', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    fireEvent.change(input, { target: { files: null } })
    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.getByTestId('empty-hint')).toBeTruthy()
  })

  it('禁用态点击合并不做任何事', async () => {
    render(<Tool />)
    await clickMerge()
    expect(mockCreate).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('合并成功：显示结果页数与下载按钮', async () => {
    render(<Tool />)
    await upload([makePdfFile('a.pdf'), makePdfFile('b.pdf')])
    await clickMerge()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCreate).toHaveBeenCalled()
    expect(screen.getByTestId('result-info').textContent).toContain('2')
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('下载按钮调用 downloadBlob，blob 为 PDF 且文件名为首文件加后缀', async () => {
    render(<Tool />)
    await upload([makePdfFile('report.pdf'), makePdfFile('b.pdf')])
    await clickMerge()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect((blob as Blob).type).toBe('application/pdf')
    expect(name).toBe('report-merged.pdf')
  })

  it('合并中显示 loading 态', async () => {
    mockCreate.mockImplementation(() => new Promise(() => {}))
    render(<Tool />)
    await upload([makePdfFile('a.pdf'), makePdfFile('b.pdf')])
    fireEvent.click(screen.getByTestId('merge'))
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
  })

  it('非 PDF 文件合并报错并指出文件名', async () => {
    render(<Tool />)
    await upload([makeNonPdfFile('notes.txt'), makePdfFile('b.pdf')])
    await clickMerge()
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    const text = screen.getByTestId('error').textContent ?? ''
    expect(text).toContain('notes.txt')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('加密 PDF 合并报错并指出文件名', async () => {
    render(<Tool />)
    await upload([makePdfFile('secret.pdf'), makePdfFile('b.pdf')])
    // 上传阶段两次 load 成功；合并前校验的第一次 load 抛加密错误
    // （pdf-lib 的 EncryptedPDFError 用 message 文案识别，见 utils 注释）
    mockLoad.mockRejectedValueOnce(new Error('Input document to PDFDocument.load is encrypted.'))
    await clickMerge()
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    // 错误文案走 i18n（key 待协调员合并），此处只断言指出了文件名
    expect(screen.getByTestId('error').textContent).toContain('secret.pdf')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('损坏 PDF 合并报错并指出文件名', async () => {
    render(<Tool />)
    await upload([makePdfFile('broken.pdf'), makePdfFile('b.pdf')])
    mockLoad.mockRejectedValueOnce(new Error('parse failed'))
    await clickMerge()
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('broken.pdf')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件合并报错并指出文件名', async () => {
    const big = makePdfFile('big.pdf', 10)
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload([big, makePdfFile('b.pdf')])
    await clickMerge()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(screen.getByTestId('error').textContent).toContain('big.pdf')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('合并后删除全部文件，清空按钮仍可见并可清除结果', async () => {
    render(<Tool />)
    await upload([makePdfFile('a.pdf'), makePdfFile('b.pdf')])
    await clickMerge()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    for (let i = 0; i < 2; i++) {
      fireEvent.click(
        screen
          .getAllByTestId('file-item')[0]
          .querySelector('[data-testid="remove"]') as HTMLElement,
      )
    }
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.getByTestId('clear')).toBeTruthy()
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('clear')).toBeNull()
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
    await waitFor(() => expect(screen.getByTestId('file-list')).toBeTruthy())
  })

  it('投放区为 label 且包含多选 PDF 文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.multiple).toBe(true)
    expect(input.accept).toContain('application/pdf')
  })
})
