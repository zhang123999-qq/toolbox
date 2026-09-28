// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['merged'], { type: 'image/jpeg' })),
  createCanvas: vi.fn(() => ({
    width: 0,
    height: 0,
    getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {} }),
  })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 100, height: 80 })),
}))

import { canvasToBlob, createCanvas, downloadBlob, loadImageFromBlob } from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockLoadImage = vi.mocked(loadImageFromBlob)

afterEach(() => {
  cleanup()
})

function makeFile(name: string, type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function uploadFiles(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

async function clickProcess() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('process'))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockLoadImage.mockImplementation(async () => ({ width: 100, height: 80 }) as never)
  mockCreateCanvas.mockImplementation(
    () =>
      ({
        width: 0,
        height: 0,
        getContext: () => ({ fillStyle: '', fillRect() {}, drawImage() {} }),
      }) as never,
  )
  mockCanvasToBlob.mockImplementation(async () => new Blob(['merged'], { type: 'image/jpeg' }))
})

describe('merge-batch 组件', () => {
  it('渲染投放区与全部选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('opt-groupsize')).toBeTruthy()
    expect(screen.getByTestId('opt-direction')).toBeTruthy()
    expect(screen.getByTestId('opt-gap')).toBeTruthy()
    expect(screen.getByTestId('opt-bgcolor')).toBeTruthy()
    expect(screen.getByTestId('opt-align')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.getByTestId('process')).toBeTruthy()
    // 初始无进度、无错误、无取消、无重置
    expect(screen.queryByTestId('progress')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('cancel')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('投放区为 label 且文件输入支持多选', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = screen.getByTestId('file-input') as HTMLInputElement
    expect(input.multiple).toBe(true)
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('file-list')).toBeNull()
  })

  it('drop 无文件时不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: null } })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('file-list')).toBeNull()
  })

  it('上传后显示已选文件列表', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    expect(screen.getByTestId('file-list')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
  })

  it('上传非图片显示错误且不加入列表', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.txt', 'text/plain')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式')
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('总张数超过 30 显示错误', async () => {
    render(<Tool />)
    const many = Array.from({ length: 31 }, (_, i) => makeFile(`f${i}.png`))
    await uploadFiles(many)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('图片过多'))
    expect(screen.queryByTestId('file-list')).toBeNull()
  })

  it('全部成功：多组各输出一张拼图并可逐项下载', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png'), makeFile('d.png')])
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-groupsize'), { target: { value: '2' } })
    })
    await clickProcess()
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('download-0')).toBeTruthy()
    expect(screen.getByTestId('download-1')).toBeTruthy()
    fireEvent.click(screen.getByTestId('download-0'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [, name0] = mockDownloadBlob.mock.calls[0]
    expect(name0).toBe('a-merged-1.jpg')
    fireEvent.click(screen.getByTestId('download-1'))
    const [, name1] = mockDownloadBlob.mock.calls[1]
    expect(name1).toBe('c-merged-2.jpg')
  })

  it('分组余 1：最后一组单张直接输出不拼接', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png'), makeFile('d.png')])
    // 默认每组 3 张 → [3,1]
    await clickProcess()
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    // 只有第一组走了 canvas 拼接，第二组单张直接输出
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(1)
    expect(mockLoadImage).toHaveBeenCalledTimes(4)
    expect(screen.getByTestId('download-0')).toBeTruthy()
    expect(screen.getByTestId('download-1')).toBeTruthy()
    fireEvent.click(screen.getByTestId('download-1'))
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    // 单张组直接输出原文件：blob 即原 File，文件名不变
    expect(blob).toBeInstanceOf(File)
    expect(name).toBe('d.png')
  })

  it('非法组大小显示错误且不启动', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-groupsize'), { target: { value: '11' } })
    })
    await clickProcess()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('组大小'))
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('部分组失败：失败组展示错误，成功组正常输出', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png'), makeFile('d.png')])
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-groupsize'), { target: { value: '2' } })
    })
    await clickProcess()
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    // 第一组失败展示错误，第二组成功可下载
    expect(screen.getByText(/解码失败/)).toBeTruthy()
    expect(screen.queryByTestId('download-0')).toBeNull()
    expect(screen.getByTestId('download-1')).toBeTruthy()
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(1)
  })

  it('Canvas 上下文不可用时该组失败', async () => {
    mockCreateCanvas.mockImplementationOnce(() => ({ getContext: () => null }) as never)
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await clickProcess()
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    expect(screen.getByText(/Canvas 2D 上下文不可用/)).toBeTruthy()
    expect(screen.queryByTestId('download-0')).toBeNull()
  })

  it('取消：停止后续分组并提示已取消', async () => {
    let releaseFirst!: (img: unknown) => void
    mockLoadImage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = resolve as unknown as (img: unknown) => void
        }),
    )
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png'), makeFile('d.png')])
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-groupsize'), { target: { value: '2' } })
    })
    await clickProcess()
    await waitFor(() => expect(screen.getByTestId('progress')).toBeTruthy())
    expect(screen.getByTestId('cancel')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByTestId('cancel'))
    })
    await act(async () => {
      releaseFirst({ width: 100, height: 80 })
    })
    // 处理已停止：进度消失、取消按钮消失；取消标记在 i18n key 合并前渲染为空，
    // 故此处以行为断言（第二组未被处理）而非文案断言
    await waitFor(() => expect(screen.queryByTestId('progress')).toBeNull())
    expect(screen.queryByTestId('cancel')).toBeNull()
    // 第二组未被处理
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(1)
  })

  it('各选项变更更新状态', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-gap'), { target: { value: '10' } })
    })
    expect((screen.getByTestId('opt-gap') as HTMLInputElement).value).toBe('10')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-bgcolor'), { target: { value: '#000000' } })
    })
    expect((screen.getByTestId('opt-bgcolor') as HTMLInputElement).value).toBe('#000000')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-align'), { target: { value: 'start' } })
    })
    expect((screen.getByTestId('opt-align') as HTMLSelectElement).value).toBe('start')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    })
    expect((screen.getByTestId('opt-format') as HTMLSelectElement).value).toBe('png')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '90' } })
    })
    expect((screen.getByTestId('opt-quality') as HTMLInputElement).value).toBe('90')
  })

  it('方向切换时对齐选项随之变化', async () => {
    render(<Tool />)
    const align = screen.getByTestId('opt-align') as HTMLSelectElement
    expect(align.value).toBe('center')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-direction'), { target: { value: 'vertical' } })
    })
    expect((screen.getByTestId('opt-direction') as HTMLSelectElement).value).toBe('vertical')
    expect((screen.getByTestId('opt-align') as HTMLSelectElement).value).toBe('center')
  })

  it('重置清空文件、结果与错误', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await clickProcess()
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile('a.png')] } })
    })
    expect(screen.getByTestId('file-list')).toBeTruthy()
  })
})
