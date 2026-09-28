// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['merged'], { type: 'image/jpeg' })),
  createCanvas: vi.fn((w: number, h: number) => ({
    width: w,
    height: h,
    getContext: () => ({ fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }),
  })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async (f: File) => {
    if (f.name.includes('p1')) return { width: 100, height: 50 }
    if (f.name.includes('p2')) return { width: 200, height: 80 }
    return { width: 50, height: 60 }
  }),
}))

import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

interface Ctx {
  fillStyle: string
  fillRect: ReturnType<typeof vi.fn>
  drawImage: ReturnType<typeof vi.fn>
}
let lastCtx: Ctx | null = null

afterEach(() => {
  cleanup()
})

function makeFile(name = 'p1.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function uploadFiles(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  lastCtx = null
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation((async (f: File) => {
    if (f.name.includes('p1')) return { width: 100, height: 50 }
    if (f.name.includes('p2')) return { width: 200, height: 80 }
    return { width: 50, height: 60 }
  }) as never)
  mockCreateCanvas.mockImplementation(((w: number, h: number) => {
    lastCtx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
    return { width: w, height: h, getContext: () => lastCtx }
  }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['m'], { type: 'image/jpeg' }))
})

describe('image-merge 组件', () => {
  it('渲染投放区与选项（默认横向，列数选项隐藏）', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-direction')).toBeTruthy()
    expect(screen.getByTestId('opt-gap')).toBeTruthy()
    expect(screen.getByTestId('opt-bgcolor')).toBeTruthy()
    expect(screen.getByTestId('opt-align')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.queryByTestId('opt-columns')).toBeNull()
  })

  it('上传两张图后拼接并显示结果与输出尺寸', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('thumb-list')).toBeTruthy()
    // 横向默认：宽 100+200=300，高 max(50,80)=80
    expect(mockCreateCanvas).toHaveBeenCalledWith(300, 80)
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 按原尺寸绘制：第二张 x=100
    expect(lastCtx?.drawImage).toHaveBeenCalledTimes(2)
    const calls = lastCtx!.drawImage.mock.calls
    expect(calls[0][1]).toBe(0)
    expect(calls[0][3]).toBe(100)
    expect(calls[1][1]).toBe(100)
    expect(calls[1][3]).toBe(200)
    // 背景色填充
    expect(lastCtx?.fillStyle).toBe('#ffffff')
  })

  it('只有一张图时给出提示错误', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('至少需要 2 张图片才能拼接')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('坏文件跳过、好图仍拼接且保留文件级错误', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('bad.txt', 'text/plain'), makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const err = screen.getByTestId('error')
    expect(err.textContent).toContain('不支持的图片格式')
    expect(err.textContent).toContain('bad.txt')
  })

  it('超大文件被跳过且不覆盖为数量错误', async () => {
    render(<Tool />)
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    await uploadFiles([big])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件过大')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('删除单张后不足 2 张给出提示并释放 URL', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('remove-0'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('至少需要 2 张图片才能拼接')
    expect(screen.queryByTestId('result')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('删除单张后仍够 2 张则重新拼接', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png'), makeFile('p3.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.click(screen.getByTestId('remove-0'))
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    expect(screen.getByTestId('result')).toBeTruthy()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('删除最后一张（无结果时）不报错', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    fireEvent.click(screen.getByTestId('remove-0'))
    expect(screen.queryByTestId('thumb-list')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('清空全部：状态、结果与错误都清除', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('thumb-list')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('清空（无结果时）只释放缩略图', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('thumb-list')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('方向切换纵向后重新拼接', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.change(screen.getByTestId('opt-direction'), { target: { value: 'vertical' } })
    await waitFor(() => {
      const calls = mockCreateCanvas.mock.calls
      expect(calls[calls.length - 1]).toEqual([200, 130])
    })
  })

  it('网格模式隐藏对齐、列数超范围报错', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.change(screen.getByTestId('opt-direction'), { target: { value: 'grid' } })
    await waitFor(() => expect(screen.getByTestId('opt-columns')).toBeTruthy())
    expect(screen.queryByTestId('opt-align')).toBeNull()
    await act(async () => {
      // number 输入框无法填入非数字，用 99 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-columns'), { target: { value: '99' } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('列数')
    fireEvent.change(screen.getByTestId('opt-columns'), { target: { value: '2' } })
    await waitFor(() => {
      const calls = mockCreateCanvas.mock.calls
      // 网格 2 列：列宽 [100,200]，行高 [80] → 300×80
      expect(calls[calls.length - 1]).toEqual([300, 80])
    })
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('下载按钮调用 downloadBlob 且文件名带时间戳', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/^merged-\d{8}-\d{6}\.jpg$/)
  })

  it('各选项变更都触发重新拼接', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())

    const merges = () => mockCanvasToBlob.mock.calls.length

    fireEvent.change(screen.getByTestId('opt-align'), { target: { value: 'top' } })
    await waitFor(() => expect(merges()).toBeGreaterThan(1))
    // 顶部对齐：第一张 y=0
    expect(lastCtx!.drawImage.mock.calls[0][2]).toBe(0)

    const c2 = merges()
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    await waitFor(() => expect(merges()).toBeGreaterThan(c2))

    const c3 = merges()
    fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '90' } })
    await waitFor(() => expect(merges()).toBeGreaterThan(c3))

    const c4 = merges()
    fireEvent.change(screen.getByTestId('opt-bgcolor'), { target: { value: '#000000' } })
    await waitFor(() => expect(merges()).toBeGreaterThan(c4))
    expect(lastCtx?.fillStyle).toBe('#000000')

    const c5 = merges()
    fireEvent.change(screen.getByTestId('opt-gap'), { target: { value: '10' } })
    await waitFor(() => expect(merges()).toBeGreaterThan(c5))
    // gap 10：宽 100+200+10=310
    const calls = mockCreateCanvas.mock.calls
    expect(calls[calls.length - 1]).toEqual([310, 80])
  })

  it('拖拽上传多张', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile('p1.png'), makeFile('p2.png')] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('投放区为 label，文件输入支持多选', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.multiple).toBe(true)
  })

  it('无文件 / 空文件列表时不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    fireEvent.change(input, { target: { files: null } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('无图时选项变更不拼接', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-gap'), { target: { value: '10' } })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('Canvas 2D 上下文不可用时报错', async () => {
    mockCreateCanvas.mockImplementationOnce((() => ({ getContext: () => null }) as never) as never)
    render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用')
  })

  it('卸载时释放 URL', async () => {
    const { unmount } = render(<Tool />)
    await uploadFiles([makeFile('p1.png'), makeFile('p2.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    unmount()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('卸载（无残留时）不报错', () => {
    const { unmount } = render(<Tool />)
    unmount()
  })
})
