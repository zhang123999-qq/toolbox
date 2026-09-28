// @vitest-environment jsdom
/**
 * pdf-ocr 组件测试
 *
 * pdfjs-dist / tesseract.js 全部 mock：jsdom 没有可用的 Canvas 2D，
 * 组件内的真实渲染链路只在浏览器里跑；这里验证状态机、错误分支与进度。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockGetDocument = vi.fn()
const mockCreateWorker = vi.fn()
const mockRecognize = vi.fn()
const mockTerminate = vi.fn()

type LoggerFn = (m: { status: string; progress?: number }) => void
/** createWorker 收到的 worker 级 logger（真实 tesseract 里进度走这里） */
let workerLogger: LoggerFn | undefined

vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  GlobalWorkerOptions: {},
}))

vi.mock('tesseract.js', () => ({
  createWorker: (...args: unknown[]) => mockCreateWorker(...args),
}))

import Tool from './Tool'

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function pdfFile(name = 'doc.pdf'): File {
  return new File(['%PDF-1.4 fake'], name, { type: 'application/pdf' })
}

/** 假页面：render 直接 resolve，不碰真实 Canvas */
function fakePdfDoc(numPages: number) {
  return {
    promise: Promise.resolve({
      numPages,
      getPage: async (n: number) => ({
        getViewport: () => ({ width: 100, height: 140 }),
        render: () => ({ promise: Promise.resolve() }),
        __page: n,
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // jsdom 的 canvas.getContext 返回 null，这里给一个假的 2d 上下文
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => ({ fillRect() {} }),
  })
  mockGetDocument.mockReturnValue(fakePdfDoc(2))
  workerLogger = undefined
  mockCreateWorker.mockImplementation(
    async (_langs: unknown, _oem: unknown, options?: { logger?: LoggerFn }) => {
      workerLogger = options?.logger
      return { recognize: mockRecognize, terminate: mockTerminate }
    },
  )
  mockRecognize.mockImplementation(async () => {
    workerLogger?.({ status: 'recognizing text', progress: 0.5 })
    return { data: { text: '  识别文本  \n\n\n多余空行' } }
  })
})

afterEach(cleanup)

describe('pdf-ocr · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('识别语言选项默认 中文+英文', () => {
    render(<Tool />)
    expect((screen.getByLabelText('识别语言') as HTMLSelectElement).value).toBe('chi_sim+eng')
  })

  it('非 PDF 文件直接中文报错，不调 pdfjs', async () => {
    render(<Tool />)
    const txt = new File(['hello'], 'note.txt', { type: 'text/plain' })
    fireEvent.change(byTestId('file'), { target: { files: [txt] } })
    await waitFor(() => expect(byTestId('ocr-error').textContent).toContain('请选择 PDF 文件'))
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('完整流程：2 页识别 → 进度条出现 → 每页结果渲染', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    // 进度条出现
    await waitFor(() => expect(byTestId('progress')).toBeTruthy(), { timeout: 10000 })
    // 两页都识别完
    await waitFor(() => expect(byTestId('ocr-page-2')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('ocr-page-1').textContent).toContain('识别文本')
    // 清洗生效：行尾空格与多余空行被压掉
    expect(byTestId('ocr-page-1').textContent).not.toContain('  \n')
    expect(mockRecognize).toHaveBeenCalledTimes(2)
    expect(mockTerminate).toHaveBeenCalledTimes(1)
    expect(byTestId('file-name').textContent).toContain('doc.pdf')
  })

  it('tesseract logger 的页内进度会更新进度条', async () => {
    // 用门控 mock 卡住第 1 页的 recognize，让 25% 的进度态稳定可断言
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    mockRecognize.mockImplementationOnce(async (): Promise<{ data: { text: string } }> => {
      workerLogger?.({ status: 'recognizing text', progress: 0.5 })
      await gate
      return { data: { text: '第一页' } }
    })
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('progress')).toBeTruthy(), { timeout: 10000 })
    // 第 1/2 页内进度 50% → 总进度 25%
    await waitFor(() => expect(byTestId('progress').getAttribute('aria-valuenow')).toBe('25'), {
      timeout: 10000,
    })
    release()
    await waitFor(() => expect(byTestId('ocr-page-2')).toBeTruthy(), { timeout: 10000 })
  })

  it('加密 PDF 给出中文解密提示', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.reject({ name: 'PasswordException', message: 'Need password' }),
    })
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('ocr-error').textContent).toContain('已加密'), {
      timeout: 10000,
    })
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('损坏的 PDF 给出中文提示', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.reject(new Error('Invalid PDF structure')),
    })
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('ocr-error').textContent).toContain('损坏'), {
      timeout: 10000,
    })
  })

  it('超过 50 页直接拒绝', async () => {
    mockGetDocument.mockReturnValue(fakePdfDoc(51))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('ocr-error').textContent).toContain('50 页上限'), {
      timeout: 10000,
    })
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('OCR 引擎加载失败 → 中文提示离线/CDN，且 worker 被终止', async () => {
    mockCreateWorker.mockRejectedValue(new Error('fetch failed'))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('ocr-error').textContent).toContain('OCR 引擎加载失败'), {
      timeout: 10000,
    })
    expect(byTestId('ocr-error').textContent).toContain('离线')
  })

  it('单页识别抛错 → 已完成页面保留（优雅降级）', async () => {
    mockRecognize
      .mockResolvedValueOnce({ data: { text: '第一页OK' } })
      .mockRejectedValueOnce(new Error('recognize boom'))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('ocr-error').textContent).toContain('recognize boom'), {
      timeout: 10000,
    })
    // 第 1 页结果保留
    expect(byTestId('ocr-page-1').textContent).toContain('第一页OK')
    expect(mockTerminate).toHaveBeenCalledTimes(1)
  })
})
