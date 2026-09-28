// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['compressed'], { type: 'image/jpeg' })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 400, height: 300 })),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
}))

import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

afterEach(() => {
  cleanup()
})

function makeFile(name = 'photo.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function uploadFiles(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

async function startProcess() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('process'))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/jpeg' }))
})

describe('image-batch 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    const input = screen.getByTestId('file-input') as HTMLInputElement
    expect(input.multiple).toBe(true)
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.getByTestId('opt-maxdim')).toBeTruthy()
  })

  it('投放区为 label 且包含多选文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('空选择不建队列', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(screen.queryByTestId('process')).toBeNull()
  })

  it('选择多文件后显示队列与开始按钮', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.jpg', 'image/jpeg')])
    expect(screen.getByTestId('item-0')).toBeTruthy()
    expect(screen.getByTestId('item-1')).toBeTruthy()
    expect(screen.getByTestId('item-0').textContent).toContain('a.png')
    expect(screen.getByTestId('process')).toBeTruthy()
    expect(screen.getByTestId('progress').textContent).toContain('0 / 2')
  })

  it('超过 20 个文件直接报错', async () => {
    render(<Tool />)
    const files = Array.from({ length: 21 }, (_, i) => makeFile(`f${i}.png`))
    await uploadFiles(files)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('20')
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('全部成功：进度 2/2，逐项可下载', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.jpg', 'image/jpeg')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-1')).toBeTruthy())
    expect(mockLoadImage).toHaveBeenCalledTimes(2)
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('progress').textContent).toContain('2 / 2')
    // 缩略图、原体积→新体积、压缩率
    const item0 = screen.getByTestId('item-0')
    expect(item0.querySelector('img')).toBeTruthy()
    expect(item0.textContent).toContain('1024 B')
    expect(item0.textContent).toContain('→')
    expect(item0.textContent).toContain('%')
    expect(screen.getByTestId('download-0')).toBeTruthy()
  })

  it('部分失败：失败项显示原因，成功项仍可下载', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('bad.txt', 'text/plain'), makeFile('good.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('reason-0')).toBeTruthy())
    // 失败原因文案走 i18n（imageBatch.error.unsupported），key 待协调员合并；
    // 合并前 t 返回 undefined，此处仅断言失败项渲染了原因位且无下载按钮
    expect(screen.queryByTestId('download-0')).toBeNull()
    expect(screen.getByTestId('download-1')).toBeTruthy()
    expect(screen.getByTestId('progress').textContent).toContain('2 / 2')
  })

  it('全部失败：无下载按钮，进度仍走完', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.txt', 'text/plain'), makeFile('b.txt', 'text/plain')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('reason-1')).toBeTruthy())
    expect(screen.queryByTestId('download-0')).toBeNull()
    expect(screen.queryByTestId('download-1')).toBeNull()
    expect(screen.getByTestId('progress').textContent).toContain('2 / 2')
  })

  it('单文件超 50MB 时该项失败并给出原因', async () => {
    render(<Tool />)
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: 60 * 1024 * 1024 })
    await uploadFiles([big])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('reason-0')).toBeTruthy())
    expect(screen.getByTestId('reason-0').textContent).toContain('文件过大')
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('图片解码失败时该项失败', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await uploadFiles([makeFile()])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('reason-0').textContent).toContain('解码失败'))
  })

  it('质量非法时点击开始显示错误且不处理', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 101 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await uploadFiles([makeFile()])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.getByTestId('progress').textContent).toContain('0 / 1')
  })

  it('取消后不再启动新的项，处理中的项正常收尾', async () => {
    const resolvers: Array<(img: { width: number; height: number }) => void> = []
    mockLoadImage.mockImplementation(
      () =>
        new Promise((resolve: (img: { width: number; height: number }) => void) => {
          resolvers.push(resolve)
        }) as never,
    )
    render(<Tool />)
    await uploadFiles([
      makeFile('a.png'),
      makeFile('b.png'),
      makeFile('c.png'),
      makeFile('d.png'),
      makeFile('e.png'),
    ])
    await startProcess()
    // 3 个 worker 各取一项进入处理中
    expect(resolvers).toHaveLength(3)
    expect(screen.getByTestId('cancel')).toBeTruthy()
    // 处理中再次选择文件应被忽略
    await act(async () => {
      fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile('z.png')] } })
    })
    expect(screen.queryByTestId('item-5')).toBeNull()
    // 点取消后再放行，worker 收尾当前项后退出，不再取新项
    await act(async () => {
      fireEvent.click(screen.getByTestId('cancel'))
    })
    await act(async () => {
      resolvers.forEach((r) => r({ width: 800, height: 600 }))
    })
    await waitFor(() => expect(screen.queryByTestId('cancel')).toBeNull())
    expect(mockLoadImage).toHaveBeenCalledTimes(3)
    expect(screen.getByTestId('progress').textContent).toContain('3 / 5')
    expect(screen.getByTestId('download-0')).toBeTruthy()
    expect(screen.queryByTestId('download-3')).toBeNull()
    expect(screen.queryByTestId('download-4')).toBeNull()
    // 取消后可重新开始
    expect(screen.getByTestId('process')).toBeTruthy()
  })

  it('并发上限为 3', async () => {
    let active = 0
    let maxActive = 0
    mockLoadImage.mockImplementation(async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      await Promise.resolve()
      active -= 1
      return { width: 800, height: 600 } as never
    })
    render(<Tool />)
    await uploadFiles([
      makeFile('a.png'),
      makeFile('b.png'),
      makeFile('c.png'),
      makeFile('d.png'),
      makeFile('e.png'),
    ])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-4')).toBeTruthy())
    expect(mockLoadImage).toHaveBeenCalledTimes(5)
    expect(maxActive).toBe(3)
  })

  it('切换输出格式后文件名扩展名随之变化', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await uploadFiles([makeFile('photo.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-0'))
    const [, name] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(name).toMatch(/photo-batch\.webp$/)
  })

  it('最大边选项参与处理', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-maxdim'), { target: { value: '400' } })
    })
    await uploadFiles([makeFile()])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    // 800x600 原图，最大边 400 → 等比缩为 400x300
    expect(mockDrawScaled).toHaveBeenCalledWith(expect.anything(), 800, 600, 400, 300)
  })

  it('下载按钮调用 downloadBlob 且文件名带 -batch 后缀', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('photo.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-0'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(name).toMatch(/photo-batch\.jpg$/)
  })

  it('重置清空队列并释放对象 URL', async () => {
    render(<Tool />)
    await uploadFiles([makeFile()])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(screen.queryByTestId('progress')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('重新开始会释放上一轮的对象 URL', async () => {
    render(<Tool />)
    await uploadFiles([makeFile()])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    await startProcess()
    await waitFor(() => expect(mockLoadImage).toHaveBeenCalledTimes(2))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
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
    await waitFor(() => expect(screen.getByTestId('item-0')).toBeTruthy())
  })

  it('无 dataTransfer 的 drop 不报错', () => {
    render(<Tool />)
    fireEvent.drop(screen.getByTestId('dropzone'))
    expect(screen.queryByTestId('result-list')).toBeNull()
  })
})
