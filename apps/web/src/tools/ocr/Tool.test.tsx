// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  drawScaled: vi.fn(() => ({ width: 400, height: 300 })),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
}))

vi.mock('tesseract.js', () => ({
  createWorker: vi.fn(),
}))

import { createWorker } from 'tesseract.js'
import { drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockCreateWorker = vi.mocked(createWorker)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

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

/** 假 worker：recognize 返回固定文本，terminate 可断言 */
function fakeWorker(text = '识别到的文字') {
  return {
    recognize: vi.fn(async () => ({ data: { text } })),
    terminate: vi.fn(async () => ({})),
  }
}

function makeFile(name = 'photo.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
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

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => ({ width: 400, height: 300 }) as never)
  // 默认引擎：创建时触发一次无参数 logger，识别返回固定文本
  mockCreateWorker.mockImplementation(async (_langs, _oem, options) => {
    options?.logger?.({
      status: 'loading tesseract core',
      progress: 0,
      jobId: '1',
      workerId: '1',
      userJobId: '1',
    })
    return fakeWorker() as never
  })
})

describe('ocr 组件', () => {
  it('渲染投放区、语言选项与 CDN 说明', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('cdn-notice')).toBeTruthy()
    expect((screen.getByTestId('opt-chiSim') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('opt-eng') as HTMLInputElement).checked).toBe(true)
  })

  it('上传合法图片后显示进度与识别结果', async () => {
    const d = deferred<never>()
    mockCreateWorker.mockImplementationOnce(() => d.promise)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    await act(async () => {
      d.resolve(fakeWorker() as never)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect((screen.getByTestId('result-text') as HTMLTextAreaElement).value).toBe('识别到的文字')
    expect((screen.getByTestId('preview') as HTMLImageElement).src).toContain('blob:mock-url')
    expect(screen.getByTestId('copy')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
    expect(mockCreateWorker).toHaveBeenCalledWith(
      ['chi_sim', 'eng'],
      undefined,
      expect.objectContaining({ logger: expect.any(Function) }),
    )
  })

  it('任务结束后释放 worker', async () => {
    const worker = fakeWorker()
    mockCreateWorker.mockImplementationOnce(async () => worker as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('文件超限显示错误', async () => {
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('未选语言显示错误且不创建 worker', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-chiSim'))
    fireEvent.click(screen.getByTestId('opt-eng'))
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockCreateWorker).not.toHaveBeenCalled()
  })

  it('语言复选框可切换', () => {
    render(<Tool />)
    const chiSim = screen.getByTestId('opt-chiSim') as HTMLInputElement
    fireEvent.click(chiSim)
    expect(chiSim.checked).toBe(false)
    fireEvent.click(chiSim)
    expect(chiSim.checked).toBe(true)
  })

  it('只选英文时按 eng 创建 worker', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-chiSim'))
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCreateWorker).toHaveBeenCalledWith(
      ['eng'],
      undefined,
      expect.objectContaining({ logger: expect.any(Function) }),
    )
  })

  it('识别引擎加载失败显示错误', async () => {
    mockCreateWorker.mockRejectedValueOnce(new Error('load failed'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('识别失败显示错误', async () => {
    mockCreateWorker.mockImplementationOnce(async () => {
      return {
        recognize: vi.fn(async () => {
          throw new Error('recognize failed')
        }),
        terminate: vi.fn(async () => ({})),
      } as never
    })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('取消识别：引擎加载中取消', async () => {
    const d = deferred<never>()
    mockCreateWorker.mockImplementationOnce(() => d.promise)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    fireEvent.click(screen.getByTestId('cancel'))
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    expect(screen.getByTestId('error')).toBeTruthy()
    // 取消后引擎才建好：应被立即释放，且不写入结果
    const worker = fakeWorker()
    await act(async () => {
      d.resolve(worker as never)
    })
    expect(screen.queryByTestId('result')).toBeNull()
    expect(worker.terminate).toHaveBeenCalled()
  })

  it('取消识别：识别中取消后 resolve 不再写入结果', async () => {
    const d = deferred<{ data: { text: string } }>()
    mockCreateWorker.mockImplementationOnce(async () => {
      return {
        recognize: vi.fn(() => d.promise),
        terminate: vi.fn(async () => ({})),
      } as never
    })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    fireEvent.click(screen.getByTestId('cancel'))
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    await act(async () => {
      d.resolve({ data: { text: '迟到文本' } })
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
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    fireEvent.click(screen.getByTestId('cancel'))
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    await act(async () => {
      d.reject(new Error('interrupted'))
    })
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('新上传时旧的图片加载任务被丢弃', async () => {
    const dA = deferred<never>()
    const dB = deferred<never>()
    mockLoadImage.mockImplementationOnce(() => dA.promise).mockImplementationOnce(() => dB.promise)
    render(<Tool />)
    await upload(makeFile('a.png'))
    await upload(makeFile('b.png'))
    await act(async () => {
      dA.resolve({ width: 800, height: 600 } as never)
    })
    // 旧任务已过期：不应为它创建 worker
    expect(mockCreateWorker).not.toHaveBeenCalled()
    await act(async () => {
      dB.resolve({ width: 800, height: 600 } as never)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCreateWorker).toHaveBeenCalledTimes(1)
  })

  it('新上传终止旧任务，旧 logger 不再更新进度', async () => {
    const loggers: Array<(m: { status: string; progress: number }) => void> = []
    const workers: Array<{
      recognize: ReturnType<typeof vi.fn>
      terminate: ReturnType<typeof vi.fn>
    }> = []
    mockCreateWorker.mockImplementation(async (_langs, _oem, options) => {
      const rawLogger = options?.logger
      // 包装一层：测试里只关心 status/progress，补齐 LoggerMessage 其余字段
      loggers.push((m) => rawLogger?.({ ...m, jobId: '1', workerId: '1', userJobId: '1' }))
      const worker = {
        recognize: vi.fn(() => new Promise(() => {})),
        terminate: vi.fn(async () => ({})),
      }
      workers.push(worker)
      return worker as never
    })
    render(<Tool />)
    await upload(makeFile('a.png'))
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    await act(async () => {
      loggers[0]({ status: 'loading language traineddata', progress: 0.3 })
    })
    expect((screen.getByTestId('progress-bar') as HTMLElement).style.width).toBe('30%')
    // 新上传：旧 worker 被终止
    await upload(makeFile('b.png'))
    expect(workers[0].terminate).toHaveBeenCalled()
    await waitFor(() => expect(loggers.length).toBe(2))
    await act(async () => {
      loggers[1]({ status: 'loading language traineddata', progress: 0.6 })
    })
    expect((screen.getByTestId('progress-bar') as HTMLElement).style.width).toBe('60%')
    // 旧任务的 logger 已失效：调用后进度不变
    await act(async () => {
      loggers[0]({ status: 'loading language traineddata', progress: 0.9 })
    })
    expect((screen.getByTestId('progress-bar') as HTMLElement).style.width).toBe('60%')
  })

  it('复制结果成功', async () => {
    const writeText = stubClipboard(async () => undefined)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('copied')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith('识别到的文字')
  })

  it('复制失败显示降级提示', async () => {
    stubClipboard(async () => {
      throw new Error('denied')
    })
    render(<Tool />)
    await upload(makeFile())
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
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    await waitFor(() => expect(screen.queryByTestId('result')).toBeNull())
    expect(screen.getByTestId('dropzone')).toBeTruthy()
  })

  it('卸载时终止残留 worker', async () => {
    const worker = fakeWorker()
    worker.recognize = vi.fn(() => new Promise(() => {}))
    mockCreateWorker.mockImplementationOnce(async () => worker as never)
    const { unmount } = render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    unmount()
    expect(worker.terminate).toHaveBeenCalled()
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
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
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
    fireEvent.change(input, { target: { files: null } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })
})
