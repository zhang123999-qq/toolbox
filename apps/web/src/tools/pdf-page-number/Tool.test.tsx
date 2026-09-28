// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

// pdf-lib 整体 mock：Tool 与 utils 共用同一份假实现，便于断言绘制行为
const mocks = vi.hoisted(() => {
  const drawText = vi.fn()
  const getPage = vi.fn((_index: number) => ({
    getSize: () => ({ width: 595, height: 842 }),
    drawText,
  }))
  const embedFont = vi.fn(async () => ({
    widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5,
  }))
  const save = vi.fn(
    async (): Promise<Uint8Array<ArrayBufferLike>> => new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  )
  const load = vi.fn()
  return { drawText, getPage, embedFont, save, load }
})

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: (...args: unknown[]) => mocks.load(...args),
  },
  StandardFonts: { Helvetica: 'Helvetica' },
  EncryptedPDFError: class EncryptedPDFError extends Error {
    constructor() {
      super('Input document to `PDFDocument.load` is encrypted.')
      this.name = 'EncryptedPDFError'
    }
  },
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { EncryptedPDFError } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'doc.pdf', size = 1024): File {
  const bytes = new Uint8Array(size)
  // %PDF- 魔数头
  bytes[0] = 0x25
  bytes[1] = 0x50
  bytes[2] = 0x44
  bytes[3] = 0x46
  bytes[4] = 0x2d
  return new File([bytes], name, { type: 'application/pdf' })
}

function makeTextFile(): File {
  return new File(['hello world'], 'a.txt', { type: 'text/plain' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function uploadAndAdd(file: File = makePdfFile()) {
  await upload(file)
  await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
  fireEvent.click(screen.getByTestId('add'))
  await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mocks.getPage.mockImplementation((_index: number) => ({
    getSize: () => ({ width: 595, height: 842 }),
    drawText: mocks.drawText,
  }))
  mocks.embedFont.mockImplementation(async () => ({
    widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5,
  }))
  mocks.save.mockImplementation(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]))
  mocks.load.mockImplementation(async () => ({
    getPageCount: () => 3,
    getPage: mocks.getPage,
    embedFont: mocks.embedFont,
    save: mocks.save,
  }))
})

describe('pdf-page-number 组件', () => {
  it('渲染投放区与全部选项，初始无添加按钮与结果', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-position')).toBeTruthy()
    expect(screen.getByTestId('opt-style')).toBeTruthy()
    expect(screen.getByTestId('opt-start')).toBeTruthy()
    expect(screen.getByTestId('opt-from')).toBeTruthy()
    expect(screen.getByTestId('opt-size')).toBeTruthy()
    expect(screen.getByTestId('opt-margin')).toBeTruthy()
    expect(screen.queryByTestId('add')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
  })

  it('上传合法 PDF 后显示文件信息与添加按钮', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('file-info')).toBeTruthy())
    expect(screen.getByTestId('add')).toBeTruthy()
    expect(screen.getByTestId('clear')).toBeTruthy()
    expect(mocks.load).toHaveBeenCalled()
  })

  it('点击添加页码后显示结果与下载按钮，3 页全部绘制', async () => {
    render(<Tool />)
    await uploadAndAdd()
    expect(screen.getByTestId('result-info')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mocks.drawText).toHaveBeenCalledTimes(3)
    expect(mocks.getPage).toHaveBeenCalledWith(0)
    expect(mocks.getPage).toHaveBeenCalledWith(1)
    expect(mocks.getPage).toHaveBeenCalledWith(2)
  })

  it('从第 2 页开始只绘制后 2 页，起始编号递增', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-from'), { target: { value: '2' } })
      fireEvent.change(screen.getByTestId('opt-start'), { target: { value: '5' } })
      fireEvent.change(screen.getByTestId('opt-style'), { target: { value: 'page' } })
    })
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mocks.drawText).toHaveBeenCalledTimes(2)
    expect(mocks.getPage).toHaveBeenCalledWith(1)
    expect(mocks.getPage).toHaveBeenCalledWith(2)
    expect(mocks.getPage).not.toHaveBeenCalledWith(0)
    const texts = mocks.drawText.mock.calls.map((c) => c[0])
    expect(texts).toEqual(['page 5', 'page 6'])
  })

  it('位置选项透传到绘制坐标（右上）', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-position'), { target: { value: 'topRight' } })
    })
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 文本 '1'：宽 = 1*12*0.5 = 6；x = 595-36-6 = 553；y = 842-36-12 = 794
    expect(mocks.drawText).toHaveBeenCalledWith('1', expect.objectContaining({ x: 553, y: 794 }))
  })

  it('上传非 PDF 显示错误', async () => {
    render(<Tool />)
    await upload(makeTextFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('不是有效的 PDF 文件'),
    )
    expect(screen.queryByTestId('add')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件过大报错', async () => {
    render(<Tool />)
    const file = makePdfFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('加密 PDF 明确报错', async () => {
    mocks.load.mockRejectedValueOnce(new EncryptedPDFError())
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('已加密'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('PDF 损坏透出读取失败', async () => {
    mocks.load.mockRejectedValueOnce(new Error('Invalid PDF structure'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('PDF 读取失败'))
  })

  it('字号超范围报错', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    // number 输入框无法填入非数字，用 1000 触发超范围错误
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-size'), { target: { value: '1000' } })
    })
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('字号超出范围'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('边距超范围报错', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-margin'), { target: { value: '999' } })
    })
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('边距超出范围'))
  })

  it('起始编号超大报错', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-start'), { target: { value: '10000000' } })
    })
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('起始编号过大'))
  })

  it('起始页为 0 报错', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-from'), { target: { value: '0' } })
    })
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('≥1'))
  })

  it('起始页超出总页数报错', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-from'), { target: { value: '9' } })
    })
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('超出总页数'))
    expect(mocks.drawText).not.toHaveBeenCalled()
  })

  it('绘制过程中显示 processing', async () => {
    let resolveSave!: (bytes: Uint8Array<ArrayBufferLike>) => void
    mocks.save.mockImplementationOnce(
      () =>
        new Promise<Uint8Array<ArrayBufferLike>>((resolve) => {
          resolveSave = resolve
        }),
    )
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('add')).toBeTruthy())
    fireEvent.click(screen.getByTestId('add'))
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      resolveSave(new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('选项变更后旧结果清空', async () => {
    render(<Tool />)
    await uploadAndAdd()
    expect(screen.getByTestId('download')).toBeTruthy()
    fireEvent.change(screen.getByTestId('opt-style'), { target: { value: 'nOfN' } })
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
    // 添加按钮仍在，可重新生成
    expect(screen.getByTestId('add')).toBeTruthy()
  })

  it('下载按钮调用 downloadBlob 且文件名带 -pagenumber.pdf', async () => {
    render(<Tool />)
    await uploadAndAdd(makePdfFile('report.pdf'))
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('report-pagenumber.pdf')
  })

  it('清空按钮重置状态', async () => {
    render(<Tool />)
    await uploadAndAdd()
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('file-info')).toBeNull()
    expect(screen.queryByTestId('add')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
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
    await waitFor(() => expect(screen.getByTestId('file-info')).toBeTruthy())
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mocks.load).not.toHaveBeenCalled()
  })
})
