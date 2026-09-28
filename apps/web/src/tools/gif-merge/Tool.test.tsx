// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'
import type * as imageLib from '../../lib/image'

/** 可控的 gif.js 假实现：on/render/abort/addFrame 均可观察，finished/progress 手动触发 */
interface MockGifInstance {
  handlers: Record<string, (...args: never[]) => void>
  options: unknown
  addFrame: ReturnType<typeof vi.fn>
  render: ReturnType<typeof vi.fn>
  abort: ReturnType<typeof vi.fn>
}

const gifState = vi.hoisted(() => ({
  instances: [] as MockGifInstance[],
}))

vi.mock('gif.js', () => {
  class MockGIF {
    handlers: Record<string, (...args: never[]) => void> = {}
    options: unknown
    addFrame = vi.fn()
    render = vi.fn()
    abort = vi.fn()
    on = vi.fn((event: string, cb: (...args: never[]) => void) => {
      this.handlers[event] = cb
      return this
    })
    constructor(options?: unknown) {
      this.options = options
      gifState.instances.push(this)
    }
  }
  return { default: MockGIF }
})

/** lib/image 只 mock 解码与类型判断，其余（createCanvas/formatBytes）走真实实现 */
vi.mock('../../lib/image', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof imageLib
  return {
    ...actual,
    loadImageFromBlob: vi.fn(async () => ({ width: 640, height: 480 })),
    isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
    downloadBlob: vi.fn(),
  }
})

import { downloadBlob, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockLoadImage = vi.mocked(loadImageFromBlob)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockDownloadBlob = vi.mocked(downloadBlob)

/** jsdom 的 canvas.getContext('2d') 返回 null，这里打桩为可观察的假 ctx */
const ctxStub = {
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  fillStyle: '',
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high',
}
let getContextSpy: ReturnType<typeof vi.spyOn>

function makeFile(name = 'frame.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

function lastGif(): MockGifInstance {
  const inst = gifState.instances[gifState.instances.length - 1]
  if (!inst) throw new Error('测试异常：没有创建 GIF 实例')
  return inst
}

async function uploadFiles(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

async function startMergeAndWaitProgress() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('merge'))
  })
  await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
  return lastGif()
}

function triggerFinished(inst: MockGifInstance) {
  const finished = inst.handlers['finished'] as (blob: Blob) => void
  return act(async () => {
    finished(new Blob(['GIF89a'], { type: 'image/gif' }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  gifState.instances.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  getContextSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(ctxStub as unknown as CanvasRenderingContext2D)
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 640, height: 480 }) as never)
})

afterEach(() => {
  cleanup()
  getContextSpy.mockRestore()
})

describe('gif-merge 组件', () => {
  it('渲染投放区、选项与合成按钮（初始禁用）', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-delay')).toBeTruthy()
    expect(screen.getByTestId('opt-repeat')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    const input = screen.getByTestId('file-input') as HTMLInputElement
    expect(input.multiple).toBe(true)
    expect((screen.getByTestId('merge') as HTMLButtonElement).disabled).toBe(true)
  })

  it('上传两张图片后显示帧列表，合成按钮可用', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    expect(screen.getAllByTestId('frame-item')).toHaveLength(2)
    expect((screen.getByTestId('merge') as HTMLButtonElement).disabled).toBe(false)
    // 缩略图走对象 URL
    const img = screen.getAllByTestId('frame-item')[0].querySelector('img')
    expect(img?.getAttribute('src')).toBe('blob:mock-url')
  })

  it('只上传一张时合成按钮保持禁用', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    expect((screen.getByTestId('merge') as HTMLButtonElement).disabled).toBe(true)
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.txt', 'text/plain')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('frame-list')).toBeNull()
  })

  it('单文件超 50MB 显示错误', async () => {
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await uploadFiles([big])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('frame-list')).toBeNull()
  })

  it('一次上传超过 100 帧显示错误', async () => {
    const files = Array.from({ length: 101 }, (_, i) => makeFile(`f${i}.png`))
    render(<Tool />)
    await uploadFiles(files)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('frame-list')).toBeNull()
  })

  it('上移/下移调整帧顺序，越界按钮禁用', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png')])
    await waitFor(() => expect(screen.getAllByTestId('frame-item')).toHaveLength(3))
    const order = () => screen.getAllByTestId('frame-item').map((el) => el.textContent ?? '')
    // 首帧上移 / 末帧下移按钮禁用
    expect((screen.getAllByTestId('frame-up')[0] as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getAllByTestId('frame-down')[2] as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getAllByTestId('frame-up')[1] as HTMLButtonElement).disabled).toBe(false)
    // 首帧下移：b,a,c
    fireEvent.click(screen.getAllByTestId('frame-down')[0])
    expect(order()[0]).toContain('b.png')
    expect(order()[1]).toContain('a.png')
    // 第二帧上移：a,b,c（恢复）
    fireEvent.click(screen.getAllByTestId('frame-up')[1])
    expect(order()[0]).toContain('a.png')
    expect(order()[1]).toContain('b.png')
  })

  it('删除帧后列表更新', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getAllByTestId('frame-item')).toHaveLength(2))
    fireEvent.click(screen.getAllByTestId('frame-remove')[0])
    expect(screen.getAllByTestId('frame-item')).toHaveLength(1)
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    // 只剩 1 帧，合成按钮重新禁用
    expect((screen.getByTestId('merge') as HTMLButtonElement).disabled).toBe(true)
  })

  it('合成成功：进度→结果→下载', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    const inst = await startMergeAndWaitProgress()
    // 进度回调更新百分比
    const progress = inst.handlers['progress'] as (p: number) => void
    await act(async () => {
      progress(0.5)
    })
    expect(screen.getByTestId('progress-bar').getAttribute('style')).toContain('50%')
    // 构造参数：输出尺寸=第一帧尺寸，workers=2
    expect(inst.options).toMatchObject({
      workers: 2,
      quality: 10,
      width: 640,
      height: 480,
      repeat: 0,
    })
    await triggerFinished(inst)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(inst.addFrame).toHaveBeenCalledTimes(2)
    expect(inst.addFrame.mock.calls[0][1]).toMatchObject({ delay: 200, copy: true })
    expect(inst.render).toHaveBeenCalled()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    // 下载
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('a-merged.gif')
    // 合成中绘制了两帧到统一尺寸 canvas
    expect(ctxStub.drawImage).toHaveBeenCalledTimes(2)
  })

  it('输出尺寸以第一帧为准', async () => {
    mockLoadImage
      .mockImplementationOnce(async () => ({ width: 800, height: 600 }) as never)
      .mockImplementation(async () => ({ width: 400, height: 300 }) as never)
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    const inst = await startMergeAndWaitProgress()
    expect(inst.options).toMatchObject({ width: 800, height: 600 })
    await triggerFinished(inst)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('取消合成中止任务', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    const inst = await startMergeAndWaitProgress()
    fireEvent.click(screen.getByTestId('cancel'))
    expect(inst.abort).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    // 手动触发 abort 事件，让待处理的 promise  settle
    const onAbort = inst.handlers['abort'] as () => void
    await act(async () => {
      onAbort()
    })
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('重新合成会替换旧结果', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    const first = await startMergeAndWaitProgress()
    await triggerFinished(first)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const second = await startMergeAndWaitProgress()
    await triggerFinished(second)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(gifState.instances).toHaveLength(2)
    // 旧结果的 URL 被释放
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('选项变更透传到合成参数', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-delay'), { target: { value: '500' } })
      fireEvent.change(screen.getByTestId('opt-repeat'), { target: { value: '3' } })
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '5' } })
    })
    const inst = await startMergeAndWaitProgress()
    expect(inst.options).toMatchObject({ quality: 5, repeat: 3 })
    await triggerFinished(inst)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(inst.addFrame.mock.calls[0][1]).toMatchObject({ delay: 500 })
  })

  it('帧延迟非法时显示错误', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    await act(async () => {
      // number 输入框填超范围数字触发校验错误
      fireEvent.change(screen.getByTestId('opt-delay'), { target: { value: '5' } })
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('第一帧尺寸超 2048 显示错误', async () => {
    mockLoadImage.mockImplementation(async () => ({ width: 3000, height: 2000 }) as never)
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(gifState.instances).toHaveLength(0)
  })

  it('Canvas 2D 上下文不可用时显示错误', async () => {
    getContextSpy.mockReturnValueOnce(null)
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('merge'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('重置清空帧列表与结果', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    // 无结果时重置
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('frame-list')).toBeNull()
    // 有结果时重置
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    const inst = await startMergeAndWaitProgress()
    await triggerFinished(inst)
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('frame-list')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('卸载时中止未完成的合成任务', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    const inst = await startMergeAndWaitProgress()
    cleanup()
    expect(inst.abort).toHaveBeenCalled()
  })

  it('拖拽上传与拖拽状态', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    const files = [makeFile('a.png'), makeFile('b.png')]
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files } })
    })
    await waitFor(() => expect(screen.getByTestId('frame-list')).toBeTruthy())
    // 空拖拽不处理
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [] } })
    })
    expect(screen.getAllByTestId('frame-item')).toHaveLength(2)
  })

  it('投放区为 label 且包含多选文件输入', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: null } })
    })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('frame-list')).toBeNull()
  })
})
