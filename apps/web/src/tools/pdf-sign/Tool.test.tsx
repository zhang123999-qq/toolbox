// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

// pdf-lib mock：按调用顺序消费 loadQueue，依次控制“上传探测 / 签名嵌入”
//（真实 pdf-lib 行为在 test.ts 中用真实库覆盖）
vi.mock('pdf-lib', () => ({
  PDFDocument: { load: vi.fn() },
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockLoad = vi.mocked(PDFDocument.load)
const mockDownloadBlob = vi.mocked(downloadBlob)

/** 真实有效的 1x1 PNG base64：mock 的 canvas.toDataURL 返回它 */
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

interface FakePage {
  getSize(): { width: number; height: number }
  drawImage: ReturnType<typeof vi.fn>
}

interface FakeDoc {
  getPageCount(): number
  getPages(): FakePage[]
  getPage(i: number): FakePage
  embedPng: ReturnType<typeof vi.fn>
  embedJpg: ReturnType<typeof vi.fn>
  save: ReturnType<typeof vi.fn>
  _pages: FakePage[]
}

let loadQueue: Array<() => Promise<FakeDoc>>

function makeDoc(pageCount = 2): FakeDoc {
  const pages: FakePage[] = Array.from({ length: pageCount }, () => ({
    getSize: () => ({ width: 595, height: 842 }),
    drawImage: vi.fn(),
  }))
  return {
    getPageCount: () => pageCount,
    getPages: () => pages,
    getPage: (i: number) => pages[i],
    embedPng: vi.fn(async () => ({})),
    embedJpg: vi.fn(async () => ({})),
    save: vi.fn(async () => new Uint8Array([1, 2, 3])),
    _pages: pages,
  }
}

const okDoc = () => Promise.resolve(makeDoc(2))
const encryptedThrow = (): Promise<FakeDoc> =>
  Promise.reject(new Error('Input document to `PDFDocument.load` is encrypted.'))
const invalidThrow = (): Promise<FakeDoc> => Promise.reject(new Error('Invalid PDF structure'))

let mockCtx: {
  beginPath: ReturnType<typeof vi.fn>
  moveTo: ReturnType<typeof vi.fn>
  lineTo: ReturnType<typeof vi.fn>
  stroke: ReturnType<typeof vi.fn>
  clearRect: ReturnType<typeof vi.fn>
  lineWidth: number
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  loadQueue = []
  mockLoad.mockImplementation((() => {
    const next = loadQueue.shift()
    return next ? next() : okDoc()
  }) as never)
  mockCtx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    lineWidth: 4,
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
    `data:image/png;base64,${PNG_1X1_B64}`,
  )
})

function makePdfFile(name = 'contract.pdf', size = 2048) {
  const bytes = new Uint8Array(size)
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF- 魔数
  return new File([new Blob([bytes], { type: 'application/pdf' })], name, {
    type: 'application/pdf',
  })
}

/** 最小 PNG 文件头（魔数 + IHDR），供 getPngDimensions 解析 */
function sigPngBytes(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32)
  b.set([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ])
  b[16] = (width >>> 24) & 0xff
  b[17] = (width >>> 16) & 0xff
  b[18] = (width >>> 8) & 0xff
  b[19] = width & 0xff
  b[20] = (height >>> 24) & 0xff
  b[21] = (height >>> 16) & 0xff
  b[22] = (height >>> 8) & 0xff
  b[23] = height & 0xff
  return b
}

function sigPngFile(name = 'sig.png', width = 120, height = 40) {
  const bytes = sigPngBytes(width, height)
  return new File([new Blob([bytes.slice()], { type: 'image/png' })], name, { type: 'image/png' })
}

/** 最小 JPEG（SOI + APP0 + SOF0 300x200），供 getJpegDimensions 解析 */
function sigJpgFile(name = 'sig.jpg') {
  const seg = (marker: number, payload: number[]) => {
    const len = payload.length + 2
    return [0xff, marker, (len >>> 8) & 0xff, len & 0xff, ...payload]
  }
  const bytes = new Uint8Array([
    0xff,
    0xd8,
    ...seg(0xe0, new Array(14).fill(0)),
    ...seg(0xc0, [8, 0, 200, 1, 44, 1, 1, 0x11, 0]),
  ])
  return new File([new Blob([bytes], { type: 'image/jpeg' })], name, { type: 'image/jpeg' })
}

async function uploadPdf(name = 'contract.pdf') {
  loadQueue.push(okDoc)
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [makePdfFile(name)] } })
  })
  await waitFor(() => expect(screen.getByTestId('opt-page')).toBeTruthy())
}

async function uploadSigImage(file: File) {
  fireEvent.click(screen.getByTestId('tab-upload'))
  const input = screen.getByTestId('sig-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** 在签名画布上画一笔（按下→移动→抬起） */
function drawStroke(canvas: HTMLElement = screen.getByTestId('sig-canvas')) {
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 100, clientY: 50 })
  fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 130, clientY: 70 })
  fireEvent.pointerUp(canvas, { pointerId: 1 })
}

function signButton(): HTMLButtonElement {
  return screen.getByTestId('sign') as HTMLButtonElement
}

describe('pdf-sign 组件', () => {
  it('渲染投放区、声明、签名页签、画布与线宽选项；无 PDF 时无位置选项与生成按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('disclaimer')).toBeTruthy()
    expect(screen.getByTestId('tab-draw')).toBeTruthy()
    expect(screen.getByTestId('tab-upload')).toBeTruthy()
    expect(screen.getByTestId('sig-canvas')).toBeTruthy()
    expect(screen.getByTestId('opt-linewidth')).toBeTruthy()
    expect(screen.getByTestId('clear-canvas')).toBeTruthy()
    expect(screen.queryByTestId('opt-page')).toBeNull()
    expect(screen.queryByTestId('sign')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('投放区为原生 label 且包含文件输入', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('页签切换：上传页签显示签名图片输入，画布隐藏；切回恢复', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('tab-upload'))
    expect(screen.getByTestId('sig-input')).toBeTruthy()
    expect(screen.getByTestId('sig-dropzone')).toBeTruthy()
    expect(screen.queryByTestId('sig-canvas')).toBeNull()
    fireEvent.click(screen.getByTestId('tab-draw'))
    expect(screen.getByTestId('sig-canvas')).toBeTruthy()
    expect(screen.queryByTestId('sig-input')).toBeNull()
  })

  it('上传合法 PDF：显示文件名、页码下拉、滑杆、位置预览；生成按钮初始禁用', async () => {
    render(<Tool />)
    await uploadPdf()
    expect(screen.getByTestId('dropzone').textContent).toContain('contract.pdf')
    expect(screen.getByTestId('opt-page')).toBeTruthy()
    expect(screen.getByTestId('opt-x')).toBeTruthy()
    expect(screen.getByTestId('opt-y')).toBeTruthy()
    expect(screen.getByTestId('opt-scale')).toBeTruthy()
    expect(screen.getByTestId('position-preview')).toBeTruthy()
    expect(screen.getByTestId('position-marker')).toBeTruthy()
    // 无签名内容时生成按钮禁用
    expect(signButton().disabled).toBe(true)
  })

  it('上传非 PDF 显示错误，无位置选项', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, {
        target: { files: [new File([new Blob(['hello'])], 'a.txt', { type: 'text/plain' })] },
      })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('opt-page')).toBeNull()
  })

  it('超大文件显示错误，不调用 pdf-lib', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePdfFile('big.pdf', 50 * 1024 * 1024 + 1)] } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('加密 PDF 显示“已加密无法打开”错误', async () => {
    render(<Tool />)
    loadQueue.push(encryptedThrow)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePdfFile('secret.pdf')] } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('opt-page')).toBeNull()
  })

  it('损坏的 PDF 显示错误', async () => {
    render(<Tool />)
    loadQueue.push(invalidThrow)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [makePdfFile('broken.pdf')] } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('opt-page')).toBeNull()
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('拖拽上传 PDF', async () => {
    render(<Tool />)
    loadQueue.push(okDoc)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makePdfFile('drag.pdf')] } })
    })
    await waitFor(() => expect(screen.getByTestId('opt-page')).toBeTruthy())
  })

  it('在画布上绘制：调用 2d 上下文方法，生成按钮变为可用', async () => {
    render(<Tool />)
    await uploadPdf()
    drawStroke()
    expect(mockCtx.beginPath).toHaveBeenCalled()
    expect(mockCtx.moveTo).toHaveBeenCalled()
    expect(mockCtx.lineTo).toHaveBeenCalled()
    expect(mockCtx.stroke).toHaveBeenCalled()
    expect(signButton().disabled).toBe(false)
  })

  it('未按下时移动/抬起不绘制', async () => {
    render(<Tool />)
    await uploadPdf()
    const canvas = screen.getByTestId('sig-canvas')
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 60, clientY: 60 })
    fireEvent.pointerUp(canvas, { pointerId: 1 })
    expect(mockCtx.lineTo).not.toHaveBeenCalled()
    expect(signButton().disabled).toBe(true)
  })

  it('getContext 返回 null 时绘制不崩溃', async () => {
    render(<Tool />)
    await uploadPdf()
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValueOnce(null)
    const canvas = screen.getByTestId('sig-canvas')
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 })
    expect(signButton().disabled).toBe(true)
  })

  it('支持指针捕获时按下即捕获指针', () => {
    render(<Tool />)
    const canvas = screen.getByTestId('sig-canvas') as HTMLCanvasElement
    const capture = vi.fn()
    canvas.setPointerCapture = capture
    fireEvent.pointerDown(canvas, { pointerId: 7, clientX: 10, clientY: 10 })
    expect(capture).toHaveBeenCalledWith(7)
  })

  it('pointercancel 同样收笔并产生签名内容', async () => {
    render(<Tool />)
    await uploadPdf()
    const canvas = screen.getByTestId('sig-canvas')
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerCancel(canvas, { pointerId: 1 })
    expect(signButton().disabled).toBe(false)
  })

  it('清空画布后生成按钮重新禁用', async () => {
    render(<Tool />)
    await uploadPdf()
    drawStroke()
    expect(signButton().disabled).toBe(false)
    fireEvent.click(screen.getByTestId('clear-canvas'))
    expect(signButton().disabled).toBe(true)
  })

  it('线宽滑杆影响下一笔的线宽', async () => {
    render(<Tool />)
    await uploadPdf()
    fireEvent.change(screen.getByTestId('opt-linewidth'), { target: { value: '12' } })
    const canvas = screen.getByTestId('sig-canvas')
    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 10, clientY: 10 })
    expect(mockCtx.lineWidth).toBe(12)
  })

  it('上传 PNG 签名图片：显示预览，生成按钮可用', async () => {
    render(<Tool />)
    await uploadPdf()
    await uploadSigImage(sigPngFile())
    await waitFor(() => expect(screen.getByTestId('sig-preview')).toBeTruthy())
    expect(screen.getByTestId('sig-dropzone').textContent).toContain('sig.png')
    expect(signButton().disabled).toBe(false)
  })

  it('上传 JPG 签名图片：生成时走 embedJpg', async () => {
    render(<Tool />)
    await uploadPdf()
    await uploadSigImage(sigJpgFile())
    await waitFor(() => expect(screen.getByTestId('sig-preview')).toBeTruthy())
    const doc = makeDoc(2)
    loadQueue.push(() => Promise.resolve(doc))
    fireEvent.click(signButton())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(doc.embedJpg).toHaveBeenCalledTimes(1)
    expect(doc.embedPng).not.toHaveBeenCalled()
  })

  it('上传非 PNG/JPEG（如 GIF）显示错误', async () => {
    render(<Tool />)
    await uploadSigImage(
      new File([new Blob(['GIF89a'], { type: 'image/gif' })], 'sig.gif', { type: 'image/gif' }),
    )
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('sig-preview')).toBeNull()
  })

  it('上传损坏的 PNG 签名图片显示错误', async () => {
    render(<Tool />)
    const bad = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
    await uploadSigImage(
      new File([new Blob([bad], { type: 'image/png' })], 'bad.png', { type: 'image/png' }),
    )
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('上传签名图片时无文件不处理', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('tab-upload'))
    const input = screen.getByTestId('sig-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('sig-preview')).toBeNull()
  })

  it('手写签名生成成功：在第 1 页按计算落点嵌入 PNG', async () => {
    render(<Tool />)
    await uploadPdf()
    const doc = makeDoc(2)
    loadQueue.push(() => Promise.resolve(doc))
    drawStroke()
    fireEvent.click(signButton())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())

    // 手写签名经 canvas.toDataURL 得到 PNG，走 embedPng
    expect(doc.embedPng).toHaveBeenCalledTimes(1)
    const pngBytes = doc.embedPng.mock.calls[0][0] as Uint8Array
    expect(pngBytes).toBeInstanceOf(Uint8Array)
    expect(pngBytes.length).toBeGreaterThan(0)

    // 第 1 页绘制了签名，矩形数值合法且不溢出页面
    const drawImage = doc._pages[0].drawImage
    expect(drawImage).toHaveBeenCalledTimes(1)
    const [, rect] = drawImage.mock.calls[0] as [unknown, Record<string, number>]
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(595)
    expect(rect.y + rect.height).toBeLessThanOrEqual(842)
    expect(doc._pages[1].drawImage).not.toHaveBeenCalled()

    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('下载按钮调用 downloadBlob，文件名为 -signed.pdf', async () => {
    render(<Tool />)
    await uploadPdf('contract.pdf')
    const doc = makeDoc(2)
    loadQueue.push(() => Promise.resolve(doc))
    drawStroke()
    fireEvent.click(signButton())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('contract-signed.pdf')
  })

  it('嵌入失败显示错误且无结果', async () => {
    render(<Tool />)
    await uploadPdf()
    const doc = makeDoc(2)
    doc.save.mockRejectedValue(new Error('save boom'))
    loadQueue.push(() => Promise.resolve(doc))
    drawStroke()
    fireEvent.click(signButton())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('生成中显示 processing，完成后消失', async () => {
    render(<Tool />)
    await uploadPdf()
    const doc = makeDoc(2)
    let resolveSave!: (v: Uint8Array) => void
    doc.save.mockImplementation(() => new Promise<Uint8Array>((res) => (resolveSave = res)))
    loadQueue.push(() => Promise.resolve(doc))
    drawStroke()
    fireEvent.click(signButton())
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      resolveSave(new Uint8Array([9, 9]))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('页码下拉按实际页数渲染；切换到第 2 页后签名落到第 2 页', async () => {
    render(<Tool />)
    await uploadPdf()
    const select = screen.getByTestId('opt-page') as HTMLSelectElement
    expect(select.options.length).toBe(2)
    fireEvent.change(select, { target: { value: '2' } })
    const doc = makeDoc(2)
    loadQueue.push(() => Promise.resolve(doc))
    drawStroke()
    fireEvent.click(signButton())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(doc._pages[1].drawImage).toHaveBeenCalledTimes(1)
    expect(doc._pages[0].drawImage).not.toHaveBeenCalled()
  })

  it('水平/垂直滑杆调整时位置预览标记同步移动', async () => {
    render(<Tool />)
    await uploadPdf()
    const before = (screen.getByTestId('position-marker') as HTMLElement).style.left
    fireEvent.change(screen.getByTestId('opt-x'), { target: { value: '10' } })
    const after = (screen.getByTestId('position-marker') as HTMLElement).style.left
    expect(after).not.toBe(before)
    const topBefore = (screen.getByTestId('position-marker') as HTMLElement).style.top
    fireEvent.change(screen.getByTestId('opt-y'), { target: { value: '10' } })
    const topAfter = (screen.getByTestId('position-marker') as HTMLElement).style.top
    expect(topAfter).not.toBe(topBefore)
  })

  it('缩放滑杆调整时位置预览标记尺寸同步变化', async () => {
    render(<Tool />)
    await uploadPdf()
    const before = (screen.getByTestId('position-marker') as HTMLElement).style.width
    fireEvent.change(screen.getByTestId('opt-scale'), { target: { value: '200' } })
    const after = (screen.getByTestId('position-marker') as HTMLElement).style.width
    expect(after).not.toBe(before)
  })

  it('重置清空全部状态', async () => {
    render(<Tool />)
    await uploadPdf()
    drawStroke()
    expect(signButton().disabled).toBe(false)
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('opt-page')).toBeNull()
    expect(screen.queryByTestId('sign')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    // 回到手写页签，画布被重挂载（干净），无签名内容
    expect(screen.getByTestId('sig-canvas')).toBeTruthy()
    expect(screen.getByTestId('dropzone').textContent).not.toContain('contract.pdf')
  })
})
