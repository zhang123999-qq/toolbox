// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('pdf-lib', () => {
  const page = {
    getSize: () => ({ width: 600, height: 800 }),
    drawText: () => {},
    drawImage: () => {},
  }
  const doc = {
    getPageCount: () => 3,
    getPages: () => [page, page, page],
    embedFont: async () => ({ widthOfTextAtSize: () => 120 }),
    embedPng: async () => ({ scale: (f: number) => ({ width: 100 * f, height: 50 * f }) }),
    embedJpg: async () => ({ scale: (f: number) => ({ width: 100 * f, height: 50 * f }) }),
    save: async () => new Uint8Array([1, 2, 3]),
  }
  return {
    PDFDocument: { load: vi.fn(async () => doc) },
    StandardFonts: { Helvetica: 'Helvetica' },
    degrees: (n: number) => n,
    rgb: (r: number, g: number, b: number) => ({ r, g, b }),
  }
})

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

/** 可断言的假文档构造器（drawText 与 drawImage 在 page 上，embed 与 save 在 doc 上，均为 spy） */
function makeDoc() {
  const page = {
    getSize: () => ({ width: 600, height: 800 }),
    drawText: vi.fn(),
    drawImage: vi.fn(),
  }
  const doc = {
    getPageCount: () => 3,
    getPages: () => [page, page, page],
    embedFont: vi.fn(async () => ({ widthOfTextAtSize: () => 120 })),
    embedPng: vi.fn(async () => ({ scale: (f: number) => ({ width: 100 * f, height: 50 * f }) })),
    embedJpg: vi.fn(async () => ({ scale: (f: number) => ({ width: 100 * f, height: 50 * f }) })),
    save: vi.fn(async () => new Uint8Array([1, 2, 3])),
  }
  return { doc, page }
}

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

/** 假 PNG 水印图（魔数 89 50 4E 47） */
function makePngFile(name = 'wm.png') {
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return new File([bytes], name, { type: 'image/png' })
}

/** 假 JPEG 水印图（魔数 FF D8） */
function makeJpegFile(name = 'wm.jpg') {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
  return new File([bytes], name, { type: 'image/jpeg' })
}

async function uploadPdf(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function uploadImage(file: File) {
  const input = screen.getByTestId('image-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function clickApply() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('apply'))
  })
}

function switchToImageType() {
  fireEvent.click(screen.getByTestId('opt-type-image'))
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockLoad.mockImplementation(async () => makeDoc().doc as never)
})

describe('pdf-watermark 组件', () => {
  it('渲染投放区、选项，添加水印按钮初始禁用', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-type-text')).toBeTruthy()
    expect(screen.getByTestId('opt-text')).toBeTruthy()
    expect(screen.getByTestId('opt-fontsize')).toBeTruthy()
    expect(screen.getByTestId('opt-color')).toBeTruthy()
    expect(screen.getByTestId('opt-opacity')).toBeTruthy()
    expect(screen.getByTestId('opt-rotate')).toBeTruthy()
    expect(screen.getByTestId('pos-center')).toBeTruthy()
    expect(screen.getByTestId('opt-page-all')).toBeTruthy()
    expect(screen.getByTestId('ascii-note')).toBeTruthy()
    expect((screen.getByTestId('apply') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('上传 PDF 后显示文件名与页数，按钮可用', async () => {
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('pdf-info')).toBeTruthy())
    expect(screen.getByTestId('pdf-info').textContent).toContain('a.pdf')
    expect(screen.getByTestId('pdf-info').textContent).toContain('3')
    expect((screen.getByTestId('apply') as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByTestId('reset')).toBeTruthy()
  })

  it('页数未知（解析失败）时只显示文件名', async () => {
    mockLoad.mockRejectedValueOnce(new Error('parse fail'))
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('pdf-info')).toBeTruthy())
    expect(screen.getByTestId('pdf-info').textContent).toBe('a.pdf')
  })

  it('上传非 PDF 显示错误', async () => {
    render(<Tool />)
    await uploadPdf(makeNonPdfFile())
    // 错误文案走 i18n（key 待合并），此处只断言错误态结构
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('pdf-info')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件报错', async () => {
    const file = makePdfFile('big.pdf', 10)
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await uploadPdf(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
  })

  it('文字水印：添加后显示结果，drawText 参数正确', async () => {
    const { doc, page } = makeDoc()
    mockLoad.mockImplementation(async () => doc as never)
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('result-info')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(page.drawText).toHaveBeenCalledTimes(3)
    const [, opts] = page.drawText.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts['size']).toBe(48)
    expect(opts['opacity']).toBe(0.5)
    expect(opts['rotate']).toBe(45)
  })

  it('旋转自定义角度参与水印', async () => {
    const { doc, page } = makeDoc()
    mockLoad.mockImplementation(async () => doc as never)
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-rotate'), { target: { value: '30' } })
    })
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const [, opts] = page.drawText.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts['rotate']).toBe(30)
  })

  it('空水印文字报错', async () => {
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-text'), { target: { value: '' } })
    })
    await clickApply()
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('水印文字不能为空'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('中文水印文字报错', async () => {
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-text'), { target: { value: '机密' } })
    })
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('仅支持 ASCII'))
  })

  it('透明度超范围报错（number 输入用超范围数字）', async () => {
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-opacity'), { target: { value: '101' } })
    })
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('透明度超出范围'))
  })

  it('自定义页面范围非法报错', async () => {
    render(<Tool />)
    await uploadPdf(makePdfFile())
    fireEvent.click(screen.getByTestId('opt-page-custom'))
    expect(screen.getByTestId('opt-page-range')).toBeTruthy()
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-page-range'), { target: { value: 'abc' } })
    })
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('页面范围无效'))
  })

  it('加密 PDF 在添加水印时报加密错误', async () => {
    mockLoad.mockRejectedValue(new Error('Input document to `PDFDocument.load` is encrypted.'))
    render(<Tool />)
    await uploadPdf(makePdfFile())
    // 上传阶段 tryGetPageCount 吞掉解析失败，仅页数未知
    await waitFor(() => expect(screen.getByTestId('pdf-info')).toBeTruthy())
    await clickApply()
    // 加密提示走 i18n（key 待合并），只断言错误态结构
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片水印：未上传图片时报错', async () => {
    render(<Tool />)
    switchToImageType()
    expect(screen.getByTestId('image-dropzone')).toBeTruthy()
    expect(screen.queryByTestId('opt-text')).toBeNull()
    await uploadPdf(makePdfFile())
    await clickApply()
    // 提示文案走 i18n（key 待合并），只断言错误态结构
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片水印：PNG 图片可生成，embedPng/drawImage 被调用', async () => {
    const { doc, page } = makeDoc()
    mockLoad.mockImplementation(async () => doc as never)
    render(<Tool />)
    switchToImageType()
    await uploadImage(makePngFile())
    await uploadPdf(makePdfFile())
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(doc.embedPng).toHaveBeenCalled()
    expect(doc.embedJpg).not.toHaveBeenCalled()
    expect(page.drawImage).toHaveBeenCalledTimes(3)
    const [, opts] = page.drawImage.mock.calls[0] as [unknown, Record<string, unknown>]
    expect(opts['opacity']).toBe(0.5)
  })

  it('图片水印：JPEG 图片走 embedJpg', async () => {
    const { doc } = makeDoc()
    mockLoad.mockImplementation(async () => doc as never)
    render(<Tool />)
    switchToImageType()
    await uploadImage(makeJpegFile())
    await uploadPdf(makePdfFile())
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(doc.embedJpg).toHaveBeenCalled()
    expect(doc.embedPng).not.toHaveBeenCalled()
  })

  it('图片水印：非图片文件报错', async () => {
    render(<Tool />)
    switchToImageType()
    await uploadImage(makeNonPdfFile('a.txt'))
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('水印图片须为 PNG 或 JPEG 格式'),
    )
  })

  it('处理中显示加载态且按钮禁用', async () => {
    const { doc } = makeDoc()
    doc.save = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 30))
      return new Uint8Array([1, 2, 3])
    })
    mockLoad.mockImplementation(async () => doc as never)
    render(<Tool />)
    await uploadPdf(makePdfFile())
    fireEvent.click(screen.getByTestId('apply'))
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    expect((screen.getByTestId('apply') as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('下载按钮调用 downloadBlob 且文件名正确', async () => {
    render(<Tool />)
    await uploadPdf(makePdfFile('report.pdf'))
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/report-watermarked\.pdf$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await uploadPdf(makePdfFile())
    await clickApply()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('pdf-info')).toBeNull()
    expect((screen.getByTestId('apply') as HTMLButtonElement).disabled).toBe(true)
  })

  it('选项可切换：类型/位置/颜色/旋转预设/页面模式', () => {
    render(<Tool />)
    // 类型来回切换
    fireEvent.click(screen.getByTestId('opt-type-image'))
    expect(screen.getByTestId('image-dropzone')).toBeTruthy()
    fireEvent.click(screen.getByTestId('opt-type-text'))
    expect(screen.getByTestId('opt-text')).toBeTruthy()
    // 文字水印选项输入
    fireEvent.change(screen.getByTestId('opt-fontsize'), { target: { value: '60' } })
    expect((screen.getByTestId('opt-fontsize') as HTMLInputElement).value).toBe('60')
    // 九宫格位置
    fireEvent.click(screen.getByTestId('pos-top-left'))
    expect(screen.getByTestId('pos-top-left').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('pos-center').getAttribute('aria-pressed')).toBe('false')
    // 颜色
    fireEvent.change(screen.getByTestId('opt-color'), { target: { value: '#ff0000' } })
    expect((screen.getByTestId('opt-color') as HTMLSelectElement).value).toBe('#ff0000')
    // 旋转预设
    fireEvent.click(screen.getByTestId('opt-rotate--90'))
    expect((screen.getByTestId('opt-rotate') as HTMLInputElement).value).toBe('-90')
    // 页面模式来回切换
    fireEvent.click(screen.getByTestId('opt-page-custom'))
    expect(screen.getByTestId('opt-page-range')).toBeTruthy()
    fireEvent.click(screen.getByTestId('opt-page-all'))
    expect(screen.queryByTestId('opt-page-range')).toBeNull()
    // 图片水印缩放输入
    fireEvent.click(screen.getByTestId('opt-type-image'))
    fireEvent.change(screen.getByTestId('opt-scale'), { target: { value: '80' } })
    expect((screen.getByTestId('opt-scale') as HTMLInputElement).value).toBe('80')
  })

  it('拖拽上传 PDF', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('pdf-info')).toBeTruthy())
  })

  it('图片投放区拖拽高亮', () => {
    render(<Tool />)
    switchToImageType()
    const zone = screen.getByTestId('image-dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
  })

  it('图片投放区可拖拽上传', async () => {
    render(<Tool />)
    switchToImageType()
    const zone = screen.getByTestId('image-dropzone')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makePngFile()] } })
    })
    await waitFor(() => expect(zone.textContent).toContain('wm.png'))
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
    expect(mockLoad).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { files: null } })
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('图片输入无文件时不处理', () => {
    render(<Tool />)
    switchToImageType()
    const input = screen.getByTestId('image-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoad).not.toHaveBeenCalled()
  })
})
