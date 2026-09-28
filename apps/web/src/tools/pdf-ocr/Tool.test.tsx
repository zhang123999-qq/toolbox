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

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
}))

import { createWorker } from 'tesseract.js'
import { downloadBlob } from '../../lib/image'

const mockGetDocument = vi.mocked(pdfjsLib.getDocument)
const mockCreateWorker = vi.mocked(createWorker)
const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

/** 可手动决议的 promise，用于精确控制异步流程的交错 */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 单页规格：文本（Error 表示该页识别抛错）、是否渲染失败、自定义 viewport */
interface PageSpec {
  text?: string | Error
  failRender?: boolean
  viewport?: { width: number; height: number }
}

interface FakeDoc {
  numPages: number
  getPage: ReturnType<typeof vi.fn>
  destroy: ReturnType<typeof vi.fn>
}

/** 构造 getDocument 的假返回值 { promise, destroy }（对应 PDFDocumentLoadingTask） */
function docTask(promise: Promise<unknown>, destroy?: ReturnType<typeof vi.fn>) {
  return { promise, destroy: destroy ?? vi.fn(async () => undefined) } as never
}

/** 构造 numPages = specs.length 的假文档并设为 getDocument 默认实现 */
function makeDoc(specs: PageSpec[]): FakeDoc {
  const getPage = vi.fn(async (n: number) => {
    const spec = specs[n - 1] ?? {}
    return {
      getViewport: vi.fn(() => spec.viewport ?? { width: 200, height: 300 }),
      render: vi.fn(() => {
        if (spec.failRender) return { promise: Promise.reject(new Error('render boom')) }
        return { promise: Promise.resolve() }
      }),
    }
  })
  const destroy = vi.fn(async () => undefined)
  const doc = { numPages: specs.length, getPage, destroy }
  mockGetDocument.mockImplementation((() => docTask(Promise.resolve(doc), destroy)) as never)
  return doc
}

/** 按调用顺序返回文本的假 worker；Error 表示该次 recognize 抛错 */
function textWorker(texts: Array<string | Error>) {
  const recognize = vi.fn(async () => {
    const t = texts[recognize.mock.calls.length - 1]
    if (t instanceof Error) throw t
    return { data: { text: t ?? '' } }
  })
  return { recognize, terminate: vi.fn(async () => ({})) }
}

/** recognize 挂起、由测试手动决议的 worker */
function manualWorker() {
  const pending: Array<(v: { data: { text: string } }) => void> = []
  const recognize = vi.fn(
    () =>
      new Promise<{ data: { text: string } }>((resolve) => {
        pending.push(resolve)
      }),
  )
  const worker = { recognize, terminate: vi.fn(async () => ({})) }
  return { worker, pending }
}

type LoggerFn = (m: { status: string; progress: number }) => void
let loggers: LoggerFn[] = []

/** 配置下一次 createWorker 返回的 worker，并捕获其 logger */
function setupWorker(texts: Array<string | Error>) {
  const w = textWorker(texts)
  mockCreateWorker.mockImplementationOnce(async (_langs, _oem, options) => {
    const logger = options?.logger
    if (logger) {
      loggers.push((m) => logger({ ...m, jobId: '1', workerId: '1', userJobId: '1' }))
    }
    return w as never
  })
  return w
}

/** 配置下一次 createWorker 返回手动控制的 worker，并捕获其 logger */
function setupManualWorker() {
  const { worker, pending } = manualWorker()
  mockCreateWorker.mockImplementationOnce(async (_langs, _oem, options) => {
    const logger = options?.logger
    if (logger) {
      loggers.push((m) => logger({ ...m, jobId: '1', workerId: '1', userJobId: '1' }))
    }
    return worker as never
  })
  return { worker, pending }
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

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  const mock = vi.fn(writeText)
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText: mock },
    configurable: true,
  })
  return mock
}

const barWidth = () => (screen.getByTestId('progress-bar') as HTMLElement).style.width
const resultText = () => (screen.getByTestId('result-text') as HTMLTextAreaElement).value

let defaultDoc: FakeDoc

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  loggers = []
  defaultDoc = makeDoc([{}, {}, {}])
  // 默认引擎：触发一次无参数 logger，逐页返回固定文本
  mockCreateWorker.mockImplementation(async (_langs, _oem, options) => {
    const logger = options?.logger
    if (logger) {
      loggers.push((m) => logger({ ...m, jobId: '1', workerId: '1', userJobId: '1' }))
    }
    return textWorker(['第一页', '第二页', '第三页']) as never
  })
})

describe('pdf-ocr 组件', () => {
  it('渲染投放区、语言选项与 CDN 说明', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('cdn-notice')).toBeTruthy()
    expect((screen.getByTestId('opt-chiSim') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('opt-eng') as HTMLInputElement).checked).toBe(true)
  })

  it('上传 PDF 后显示进度与按页合并的识别结果', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(resultText()).toBe(
      '—— 第 1 页 ——\n第一页\n\n—— 第 2 页 ——\n第二页\n\n—— 第 3 页 ——\n第三页',
    )
    expect(screen.getByTestId('copy')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(mockCreateWorker).toHaveBeenCalledWith(
      ['chi_sim', 'eng'],
      undefined,
      expect.objectContaining({ logger: expect.any(Function) }),
    )
    // 任务结束释放 worker 与文档
    const w = (await mockCreateWorker.mock.results[0].value) as unknown as {
      terminate: ReturnType<typeof vi.fn>
    }
    await waitFor(() => expect(w.terminate).toHaveBeenCalledTimes(1))
    expect(defaultDoc.destroy).toHaveBeenCalledTimes(1)
  })

  it('单页识别失败不中断整体并记录失败页', async () => {
    setupWorker(['第一页', new Error('ocr boom'), '第三页'])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const text = resultText()
    expect(text).toContain('—— 第 1 页 ——\n第一页')
    expect(text).toContain('—— 第 2 页（识别失败：ocr boom） ——')
    expect(text).toContain('—— 第 3 页 ——\n第三页')
    expect(screen.getByTestId('failed-pages').textContent).toContain('2')
  })

  it('识别结果为空的页面填占位行', async () => {
    makeDoc([{}, {}])
    setupWorker(['', '有文字'])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(resultText()).toContain('—— 第 1 页 ——\n（本页未识别出文字）')
    expect(resultText()).toContain('—— 第 2 页 ——\n有文字')
    expect(screen.queryByTestId('failed-pages')).toBeNull()
  })

  it('渲染尺寸超限的页面记为失败页继续', async () => {
    makeDoc([{}, { viewport: { width: 20000, height: 20000 } }, {}])
    setupWorker(['第一页', '第二页', '第三页'])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(resultText()).toContain('渲染尺寸过大')
    expect(screen.getByTestId('failed-pages').textContent).toContain('2')
  })

  it('页面渲染失败记为失败页继续', async () => {
    makeDoc([{ failRender: true }, {}])
    // 第 1 页渲染失败，只有第 2 页会调用 recognize（取 texts[0]）
    setupWorker(['第二页'])
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(resultText()).toContain('—— 第 1 页（识别失败：render boom） ——')
    expect(resultText()).toContain('—— 第 2 页 ——\n第二页')
  })

  it('非 PDF 文件显示错误且不创建 worker', async () => {
    render(<Tool />)
    await upload(makeTextFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockGetDocument).not.toHaveBeenCalled()
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('文件超限显示错误', async () => {
    const file = makePdfFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('未选语言显示错误且不创建 worker', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-chiSim'))
    fireEvent.click(screen.getByTestId('opt-eng'))
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('加密 PDF 显示错误且不创建 worker', async () => {
    const err = new Error('password required')
    err.name = 'PasswordException'
    mockGetDocument.mockImplementationOnce((() => docTask(Promise.reject(err))) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('文档加载其他错误显示错误', async () => {
    mockGetDocument.mockImplementationOnce((() =>
      docTask(Promise.reject(new Error('broken pdf')))) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('broken pdf'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('加载任务销毁失败不影响结果', async () => {
    defaultDoc.destroy.mockRejectedValueOnce(new Error('destroy boom'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(resultText()).toContain('—— 第 1 页 ——')
  })

  it('文档加载前显示准备中', async () => {
    const doc = makeDoc([{}])
    const d = deferred<typeof doc>()
    mockGetDocument.mockImplementationOnce((() => docTask(d.promise, doc.destroy)) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    expect(screen.getByTestId('preparing')).toBeTruthy()
    expect(barWidth()).toBe('0%')
    await act(async () => {
      d.resolve(doc)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('引擎加载中显示引擎加载文案', async () => {
    const d = deferred<never>()
    mockCreateWorker.mockImplementationOnce(() => d.promise)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('engine-loading')).toBeTruthy())
    await act(async () => {
      d.resolve(textWorker(['x']) as never)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('识别中 logger 驱动进度条，非识别状态不驱动', async () => {
    setupManualWorker()
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('progress-current').textContent).toBe('1'))
    await act(async () => {
      loggers[0]({ status: 'loading language traineddata', progress: 0.8 })
    })
    expect(barWidth()).toBe('0%')
    await act(async () => {
      loggers[0]({ status: 'recognizing text', progress: 0.5 })
    })
    // (1-1+0.5)/3 = 16.7% → 17%
    expect(barWidth()).toBe('17%')
  })

  it('取消识别：引擎加载中取消', async () => {
    const d = deferred<never>()
    mockCreateWorker.mockImplementationOnce(() => d.promise)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    fireEvent.click(screen.getByTestId('cancel'))
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    expect(screen.getByTestId('error')).toBeTruthy()
    // 取消后引擎才建好：应被立即释放，且不写入结果
    const worker = textWorker(['x'])
    await act(async () => {
      d.resolve(worker as never)
    })
    expect(screen.queryByTestId('result')).toBeNull()
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('取消识别：识别中取消后 resolve 不再写入结果', async () => {
    const { pending } = setupManualWorker()
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    fireEvent.click(screen.getByTestId('cancel'))
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    await act(async () => {
      pending[0]({ data: { text: '迟到文本' } })
    })
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('取消识别：识别中取消后 reject 不再写入错误', async () => {
    const d = deferred<{ data: { text: string } }>()
    mockCreateWorker.mockImplementationOnce(async () => {
      return {
        recognize: vi.fn(() => d.promise),
        terminate: vi.fn(async () => ({})),
      } as never
    })
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    fireEvent.click(screen.getByTestId('cancel'))
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    const errorBefore = screen.getByTestId('error').textContent
    await act(async () => {
      d.reject(new Error('interrupted'))
    })
    // 错误仍是取消产生的，不被迟到的 reject 覆盖
    expect(screen.getByTestId('error').textContent).toBe(errorBefore)
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('取消识别：文档加载中取消', async () => {
    const d = deferred<unknown>()
    mockGetDocument.mockReturnValue(docTask(d.promise, defaultDoc.destroy))
    render(<Tool />)
    const done = upload(makePdfFile())
    await waitFor(() => expect(mockGetDocument).toHaveBeenCalled())
    fireEvent.click(screen.getByTestId('cancel'))
    await act(async () => {
      d.resolve(defaultDoc as never)
      await done
    })
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('progress')).toBeNull()
  })

  it('取消识别：页面渲染中取消', async () => {
    const d = deferred<unknown>()
    const renderMock = vi.fn(() => ({ promise: d.promise }))
    defaultDoc.getPage.mockResolvedValue({
      getViewport: () => ({ width: 100, height: 100 }),
      render: renderMock,
    } as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(renderMock).toHaveBeenCalled())
    fireEvent.click(screen.getByTestId('cancel'))
    await act(async () => {
      d.resolve(undefined)
    })
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('取消识别：文档加载中取消后加载失败不再写入错误', async () => {
    const d = deferred<unknown>()
    mockGetDocument.mockReturnValue(docTask(d.promise, defaultDoc.destroy))
    render(<Tool />)
    const done = upload(makePdfFile())
    await waitFor(() => expect(mockGetDocument).toHaveBeenCalled())
    fireEvent.click(screen.getByTestId('cancel'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    const cancelledText = screen.getByTestId('error').textContent
    await act(async () => {
      d.reject(new Error('load boom'))
      await done
    })
    // 错误仍是取消文案，未被迟到的加载失败覆盖
    expect(screen.getByTestId('error').textContent).toBe(cancelledText)
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('新上传取代旧任务：旧 worker 被终止且旧 logger 失效', async () => {
    const oldW = textWorker(['a1', 'a2', 'a3'])
    mockCreateWorker.mockImplementationOnce(async (_l, _o, options) => {
      const logger = options?.logger
      if (logger) {
        loggers.push((m) => logger({ ...m, jobId: '1', workerId: '1', userJobId: '1' }))
      }
      return oldW as never
    })
    const { pending } = setupManualWorker()
    render(<Tool />)
    await upload(makePdfFile('a.pdf'))
    await waitFor(() => expect(loggers.length).toBe(1))
    await upload(makePdfFile('b.pdf'))
    await waitFor(() => expect(loggers.length).toBe(2))
    expect(oldW.terminate).toHaveBeenCalled()
    // 新任务停在第 1 页识别中
    await waitFor(() => expect(screen.getByTestId('progress-current').textContent).toBe('1'))
    // 旧任务的 logger 已失效：调用后进度不变
    await act(async () => {
      loggers[0]({ status: 'recognizing text', progress: 0.9 })
    })
    expect(barWidth()).toBe('0%')
    // 新任务的 logger 生效
    await act(async () => {
      loggers[1]({ status: 'recognizing text', progress: 0.6 })
    })
    expect(barWidth()).toBe('20%')
    // 收尾：逐页放行新任务的 recognize，使其正常完成
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(pending.length).toBe(i + 1))
      await act(async () => {
        pending[i]({ data: { text: 'B' } })
      })
    }
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('只选英文时按 eng 创建 worker', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-chiSim'))
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCreateWorker).toHaveBeenCalledWith(
      ['eng'],
      undefined,
      expect.objectContaining({ logger: expect.any(Function) }),
    )
  })

  it('语言复选框可切换', () => {
    render(<Tool />)
    const chiSim = screen.getByTestId('opt-chiSim') as HTMLInputElement
    fireEvent.click(chiSim)
    expect(chiSim.checked).toBe(false)
    fireEvent.click(chiSim)
    expect(chiSim.checked).toBe(true)
  })

  it('复制结果成功', async () => {
    const writeText = stubClipboard(async () => undefined)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('copied')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith(resultText())
  })

  it('复制失败显示降级提示', async () => {
    stubClipboard(async () => {
      throw new Error('denied')
    })
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('clipboard 不可用时复制降级', async () => {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    })
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('下载按钮调用 downloadBlob 且文件名为 -ocr.txt', async () => {
    render(<Tool />)
    await upload(makePdfFile('report.pdf'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(name).toBe('report-ocr.txt')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    await waitFor(() => expect(screen.queryByTestId('result')).toBeNull())
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.getByTestId('dropzone')).toBeTruthy()
  })

  it('卸载时终止残留 worker', async () => {
    setupManualWorker()
    const { unmount } = render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    const w = (await mockCreateWorker.mock.results[0].value) as unknown as {
      terminate: ReturnType<typeof vi.fn>
    }
    unmount()
    expect(w.terminate).toHaveBeenCalled()
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

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toContain('application/pdf')
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    fireEvent.change(input, { target: { files: null } })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })
})
