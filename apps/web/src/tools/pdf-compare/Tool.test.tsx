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

const mockRender = vi.fn(() => ({ promise: Promise.resolve() }))

function makePage(w: number, h: number) {
  return {
    getViewport: ({ scale }: { scale: number }) => ({ width: w * scale, height: h * scale }),
    render: mockRender,
  }
}

const destroys: ReturnType<typeof vi.fn>[] = []
const getPageMocks: ReturnType<typeof vi.fn>[] = []

function makeDoc(pages: number, w: number, h: number) {
  const getPage = vi.fn(async (_n: number) => makePage(w, h))
  getPageMocks.push(getPage)
  return { numPages: pages, getPage }
}

type Ctx = {
  drawImage: ReturnType<typeof vi.fn>
  getImageData: ReturnType<typeof vi.fn>
  putImageData: ReturnType<typeof vi.fn>
  createImageData: ReturnType<typeof vi.fn>
}
let mockCtx: Ctx
let mockGetContext: ReturnType<typeof vi.spyOn>
const imageDataQueue: { data: Uint8ClampedArray; width: number; height: number }[] = []

/** 为一次像素读取排队：fill(i) 返回第 i 个像素的 [r,g,b,a] */
function queueImageData(
  w: number,
  h: number,
  fill: (i: number) => [number, number, number, number],
) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) data.set(fill(i), i * 4)
  imageDataQueue.push({ data, width: w, height: h })
}

const zeros = (): [number, number, number, number] => [0, 0, 0, 255]
const white = (): [number, number, number, number] => [255, 255, 255, 255]
const halfRed =
  (w: number, h: number) =>
  (i: number): [number, number, number, number] =>
    i < (w * h) / 2 ? [255, 0, 0, 255] : [0, 0, 0, 255]

beforeEach(() => {
  vi.clearAllMocks()
  imageDataQueue.length = 0
  destroys.length = 0
  getPageMocks.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockGetDocument.mockImplementation(((src?: { data?: Uint8Array }) => {
    // 销毁走 PDFDocumentLoadingTask.destroy（v6 的 PDFDocumentProxy 没有 destroy）
    const destroy = vi.fn(() => Promise.resolve())
    destroys.push(destroy)
    const data = src?.data
    if (!data) throw new Error('测试 mock 需要 src.data')
    let promise: Promise<unknown>
    if (data[8] === 1) {
      promise = Promise.reject(Object.assign(new Error('需要密码'), { name: 'PasswordException' }))
    } else if (data[9] === 1) {
      promise = Promise.reject(new Error('文件损坏'))
    } else {
      promise = Promise.resolve(makeDoc(data[5], data[6], data[7]))
    }
    return { promise, destroy }
  }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['x'], { type: 'image/png' }))
  mockCtx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => {
      const next = imageDataQueue.shift()
      if (!next) throw new Error('imageData 队列为空：测试需要先 queueImageData')
      return next
    }),
    putImageData: vi.fn(),
    createImageData: vi.fn((w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    })),
  }
  mockGetContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(mockCtx as never)
})

afterEach(() => {
  cleanup()
})

/**
 * 构造模拟 PDF 文件：字节布局 [0..4]=%PDF-，[5]=页数，[6]=页宽，[7]=页高，
 * [8]=1 表示加密，[9]=1 表示损坏（非加密解析失败）。
 */
function makePdfFile(
  name = 'a.pdf',
  opts: {
    pages?: number
    w?: number
    h?: number
    encrypted?: boolean
    broken?: boolean
    badMagic?: boolean
    size?: number
  } = {},
) {
  const {
    pages = 2,
    w = 100,
    h = 80,
    encrypted = false,
    broken = false,
    badMagic = false,
    size = 64,
  } = opts
  const bytes = new Uint8Array(size)
  if (!badMagic) bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d])
  bytes[5] = pages
  bytes[6] = w
  bytes[7] = h
  if (encrypted) bytes[8] = 1
  if (broken) bytes[9] = 1
  return new File([bytes], name, { type: 'application/pdf' })
}

async function uploadSlot(which: 'A' | 'B', file: File) {
  const input = screen.getByTestId(which === 'A' ? 'file-a' : 'file-b') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function uploadBoth(a = makePdfFile('a.pdf'), b = makePdfFile('b.pdf')) {
  await uploadSlot('A', a)
  await uploadSlot('B', b)
}

/**
 * 为一次 2 页对比准备像素队列（默认页 100x80 → 1.2 倍渲染为 120x96）：
 * runCompare 消费 A1 B1 A2 B2，自动详情（第 1 页）再消费 A1 B1。
 * 第 1 页两份一致（0 差异），第 2 页 B 一半像素变红（50.0% 差异）。
 */
function queueCompare2Pages() {
  queueImageData(120, 96, zeros)
  queueImageData(120, 96, zeros)
  queueImageData(120, 96, zeros)
  queueImageData(120, 96, halfRed(120, 96))
  queueImageData(120, 96, zeros)
  queueImageData(120, 96, zeros)
}

async function compare() {
  queueCompare2Pages()
  fireEvent.click(screen.getByTestId('compare'))
  await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  await waitFor(() => expect(screen.getByTestId('detail')).toBeTruthy())
}

const pageCalls = () => getPageMocks.reduce((n, m) => n + m.mock.calls.length, 0)

describe('pdf-compare 组件', () => {
  it('渲染两个投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone-a')).toBeTruthy()
    expect(screen.getByTestId('dropzone-b')).toBeTruthy()
    expect(screen.getByTestId('file-a')).toBeTruthy()
    expect(screen.getByTestId('file-b')).toBeTruthy()
    expect(screen.getByTestId('opt-threshold')).toBeTruthy()
    expect(screen.getByTestId('opt-view')).toBeTruthy()
    expect(screen.queryByTestId('compare')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('投放区为 label 且只接受 PDF', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone-a')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toContain('application/pdf')
  })

  it('只上传 A 时不显示对比按钮', async () => {
    render(<Tool />)
    await uploadSlot('A', makePdfFile('a.pdf'))
    expect(screen.queryByTestId('compare')).toBeNull()
    expect(screen.getByTestId('reset')).toBeTruthy()
  })

  it('上传非 PDF 显示槽位错误', async () => {
    render(<Tool />)
    await uploadSlot('A', makePdfFile('a.pdf', { badMagic: true }))
    const err = await screen.findByTestId('error-a')
    expect(err.getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('compare')).toBeNull()
  })

  it('超大文件显示槽位错误', async () => {
    render(<Tool />)
    await uploadSlot('A', makePdfFile('big.pdf', { size: 50 * 1024 * 1024 + 1 }))
    await waitFor(() => expect(screen.getByTestId('error-a')).toBeTruthy())
  })

  it('B 槽位校验失败不影响 A', async () => {
    render(<Tool />)
    await uploadSlot('A', makePdfFile('a.pdf'))
    await uploadSlot('B', makePdfFile('b.pdf', { badMagic: true }))
    await waitFor(() => expect(screen.getByTestId('error-b')).toBeTruthy())
    expect(screen.queryByTestId('error-a')).toBeNull()
    expect(screen.queryByTestId('compare')).toBeNull()
  })

  it('上传两份合法 PDF 后显示对比按钮', async () => {
    render(<Tool />)
    await uploadBoth()
    expect(screen.getByTestId('compare')).toBeTruthy()
  })

  it('对比后显示页数信息、差异列表与详情', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    expect(screen.getByTestId('page-count-info')).toBeTruthy()
    expect(screen.getByTestId('summary')).toBeTruthy()
    expect(screen.getByTestId('page-list')).toBeTruthy()
    expect(screen.getAllByTestId('page-item')).toHaveLength(2)
    expect(screen.getByTestId('diff-stats')).toBeTruthy()
    expect(screen.getByTestId('download-report')).toBeTruthy()
    expect(mockGetDocument).toHaveBeenCalledTimes(2)
  })

  it('差异统计正确：页1无差异、页2一半差异', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    const items = screen.getAllByTestId('page-item')
    expect(items[0].textContent).toContain('0.0%')
    expect(items[1].textContent).toContain('50.0%')
    // 自动选中第 1 页：0 差异
    expect(screen.getByTestId('diff-stats').textContent).toContain('0.0%')
    expect(screen.getByTestId('no-diff')).toBeTruthy()
    // 选中第 2 页：详情按需重渲染
    queueImageData(120, 96, zeros)
    queueImageData(120, 96, halfRed(120, 96))
    fireEvent.click(items[1])
    await waitFor(() => expect(screen.getByTestId('diff-stats').textContent).toContain('50.0%'))
    expect(screen.queryByTestId('no-diff')).toBeNull()
    expect(screen.getByTestId('detail-img-a')).toBeTruthy()
    expect(screen.getByTestId('detail-img-b')).toBeTruthy()
  })

  it('完全一致时显示无差异结论', async () => {
    render(<Tool />)
    await uploadBoth()
    // 全部排零像素：两页都 0 差异
    for (let i = 0; i < 6; i++) queueImageData(120, 96, zeros)
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await waitFor(() => expect(screen.getByTestId('summary').textContent).toContain('无差异'))
  })

  it('页数不同时提示并列出 A 多出的页', async () => {
    render(<Tool />)
    await uploadBoth(makePdfFile('a.pdf', { pages: 3 }), makePdfFile('b.pdf', { pages: 2 }))
    await compare()
    expect(screen.getByTestId('page-count-mismatch')).toBeTruthy()
    expect(screen.getByTestId('extra-a').textContent).toContain('3')
    expect(screen.queryByTestId('extra-b')).toBeNull()
    // 只对比了 2 页
    expect(screen.getAllByTestId('page-item')).toHaveLength(2)
  })

  it('B 页数更多时列出 B 多出的页', async () => {
    render(<Tool />)
    await uploadBoth(makePdfFile('a.pdf', { pages: 2 }), makePdfFile('b.pdf', { pages: 4 }))
    await compare()
    expect(screen.getByTestId('page-count-mismatch')).toBeTruthy()
    expect(screen.getByTestId('extra-b').textContent).toContain('3')
    expect(screen.queryByTestId('extra-a')).toBeNull()
  })

  it('A 加密时明确提示文件 A 打不开', async () => {
    render(<Tool />)
    await uploadBoth(makePdfFile('a.pdf', { encrypted: true }), makePdfFile('b.pdf'))
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件 A')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('B 加密时明确提示文件 B 且释放已加载的 A', async () => {
    render(<Tool />)
    await uploadBoth(makePdfFile('a.pdf'), makePdfFile('b.pdf', { encrypted: true }))
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件 B')
    // A 已加载、B 失败：A 的 destroy 被调用避免泄漏
    expect(destroys[0]).toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('A 解析失败（非加密）时提示 invalidA', async () => {
    render(<Tool />)
    await uploadBoth(makePdfFile('a.pdf', { broken: true }), makePdfFile('b.pdf'))
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件 A')
  })

  it('B 解析失败（非加密）时提示 invalidB', async () => {
    render(<Tool />)
    await uploadBoth(makePdfFile('a.pdf'), makePdfFile('b.pdf', { broken: true }))
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件 B')
  })

  it('对比中显示进度且可取消', async () => {
    let release!: (page: unknown) => void
    const gate = new Promise<unknown>((resolve) => {
      release = resolve
    })
    mockGetDocument.mockImplementation((() => {
      const destroy = vi.fn(() => Promise.resolve())
      destroys.push(destroy)
      return {
        promise: Promise.resolve({
          numPages: 2,
          getPage: vi.fn(() => gate.then(() => makePage(100, 80))),
        }),
        destroy,
      }
    }) as never)
    render(<Tool />)
    await uploadBoth()
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    expect(screen.getByTestId('processing').textContent).toContain('1 / 2')
    expect(screen.getByTestId('cancel')).toBeTruthy()
    fireEvent.click(screen.getByTestId('cancel'))
    queueImageData(120, 96, zeros)
    queueImageData(120, 96, zeros)
    await act(async () => {
      release(makePage(100, 80))
    })
    await waitFor(() => expect(screen.getByTestId('cancelled')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('阈值非法时显示错误', async () => {
    render(<Tool />)
    await uploadBoth()
    await act(async () => {
      // number 输入框无法填入非数字，用 300 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-threshold'), { target: { value: '300' } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('阈值变更后复用文档缓存重新对比（不重复解析）', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    const docCalls = mockGetDocument.mock.calls.length
    const before = pageCalls()
    queueCompare2Pages()
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-threshold'), { target: { value: '50' } })
    })
    await waitFor(() => expect(pageCalls()).toBeGreaterThan(before))
    // 文档缓存命中：getDocument 不再被调用
    expect(mockGetDocument.mock.calls.length).toBe(docCalls)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('无文件时阈值变更不触发对比', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-threshold'), { target: { value: '50' } })
    expect(mockGetDocument).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('切换到叠加视图显示差异画布', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    queueImageData(120, 96, zeros)
    queueImageData(120, 96, zeros)
    fireEvent.change(screen.getByTestId('opt-view'), { target: { value: 'overlay' } })
    await waitFor(() => expect(screen.getByTestId('diff-canvas')).toBeTruthy())
    expect(screen.getByTestId('diff-overlay')).toBeTruthy()
    expect(mockCtx.putImageData).toHaveBeenCalled()
    expect(screen.queryByTestId('detail-side')).toBeNull()
  })

  it('两页尺寸不同时标记 sizeMismatch', async () => {
    render(<Tool />)
    // B 页更窄：60x80 → 72x96
    await uploadBoth(makePdfFile('a.pdf'), makePdfFile('b.pdf', { w: 60 }))
    for (let i = 0; i < 6; i++) {
      queueImageData(i % 2 === 0 ? 120 : 72, 96, white)
    }
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await waitFor(() => expect(screen.getByTestId('size-mismatch')).toBeTruthy())
  })

  it('首屏渲染像素读取失败时详情报错', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    queueImageData(120, 96, zeros)
    queueImageData(120, 96, zeros)
    // 详情重渲染时第一次 getContext 返回 null（renderPagePixels 内）
    mockGetContext.mockReturnValueOnce(null)
    fireEvent.click(screen.getAllByTestId('page-item')[1])
    await waitFor(() => expect(screen.getByTestId('detail-error')).toBeTruthy())
  })

  it('像素转画布失败时详情报错', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    queueImageData(120, 96, zeros)
    queueImageData(120, 96, zeros)
    // 前两次 getContext 正常（两页渲染），第三次（pixelsToCanvas）返回 null
    mockGetContext
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(null)
    fireEvent.click(screen.getAllByTestId('page-item')[1])
    await waitFor(() => expect(screen.getByTestId('detail-error')).toBeTruthy())
  })

  it('叠加层绘制时底图上下文不可用则详情报错', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    queueImageData(120, 96, zeros)
    queueImageData(120, 96, zeros)
    // 渲染/转画布 4 次正常，第 5 次（drawOverlay 底图）返回 null
    mockGetContext
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(null)
    fireEvent.change(screen.getByTestId('opt-view'), { target: { value: 'overlay' } })
    await waitFor(() => expect(screen.getByTestId('detail-error')).toBeTruthy())
  })

  it('叠加层绘制时顶层上下文不可用则详情报错', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    queueImageData(120, 96, zeros)
    queueImageData(120, 96, zeros)
    // 前 5 次正常，第 6 次（drawOverlay 顶层）返回 null
    mockGetContext
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(mockCtx as never)
      .mockReturnValueOnce(null)
    fireEvent.change(screen.getByTestId('opt-view'), { target: { value: 'overlay' } })
    await waitFor(() => expect(screen.getByTestId('detail-error')).toBeTruthy())
  })

  it('下载差异报告', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    fireEvent.click(screen.getByTestId('download-report'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [blob, name] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(name).toMatch(/a-vs-b-diff\.txt$/)
    expect(await blob.text()).toContain('PDF 对比报告')
  })

  it('重置清空状态并释放资源', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    expect(destroys).toHaveLength(2)
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('compare')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    // 文档被销毁，详情图 URL 被释放
    expect(destroys[0]).toHaveBeenCalled()
    expect(destroys[1]).toHaveBeenCalled()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('文档销毁失败时静默处理', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    destroys[0].mockImplementationOnce(() => Promise.reject(new Error('destroy boom')))
    destroys[1].mockImplementationOnce(() => Promise.reject(new Error('destroy boom')))
    fireEvent.click(screen.getByTestId('reset'))
    await waitFor(() => expect(screen.queryByTestId('reset')).toBeNull())
    expect(destroys[0]).toHaveBeenCalled()
    expect(destroys[1]).toHaveBeenCalled()
  })

  it('未对比时重置不触碰文档缓存', async () => {
    render(<Tool />)
    await uploadSlot('A', makePdfFile('a.pdf'))
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(destroys).toHaveLength(0)
  })

  it('重新上传文件后旧结果与缓存失效', async () => {
    render(<Tool />)
    await uploadBoth()
    await compare()
    await uploadSlot('A', makePdfFile('a2.pdf'))
    await waitFor(() => expect(screen.queryByTestId('result')).toBeNull())
    // 旧文档被销毁
    expect(destroys[0]).toHaveBeenCalled()
    // 槽位仍在，可重新对比
    expect(screen.getByTestId('compare')).toBeTruthy()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone-a')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makePdfFile('drag.pdf')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(zone.textContent).toContain('drag.pdf'))
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-a') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockGetDocument).not.toHaveBeenCalled()
    expect(screen.queryByTestId('compare')).toBeNull()
  })
})
