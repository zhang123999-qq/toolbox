// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

function makeFakeCanvas(w: number, h: number) {
  const ctx = { fillRect: vi.fn(), drawImage: vi.fn(), fillStyle: '' }
  return { width: w, height: h, getContext: vi.fn(() => ctx) }
}

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['out'], { type: 'image/jpeg' })),
  createCanvas: vi.fn((w: number, h: number) => makeFakeCanvas(w, h)),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
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

afterEach(() => {
  cleanup()
})

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

function setSelect(testId: string, value: string) {
  fireEvent.change(screen.getByTestId(testId), { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockCreateCanvas.mockImplementation((w: number, h: number) => makeFakeCanvas(w, h) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/jpeg' }))
})

describe('id-photo 组件', () => {
  it('渲染投放区与全部选项（规格/分辨率/底色/缩放/排版）', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-spec')).toBeTruthy()
    expect(screen.getByTestId('opt-dpi')).toBeTruthy()
    expect(screen.getByTestId('opt-bg')).toBeTruthy()
    expect(screen.getByTestId('opt-scale')).toBeTruthy()
    expect(screen.getByTestId('opt-layout')).toBeTruthy()
    // 默认非 custom：自定义宽高/颜色输入不渲染
    expect(screen.queryByTestId('opt-customw')).toBeNull()
    expect(screen.queryByTestId('opt-custombg')).toBeNull()
  })

  it('上传合法图片后显示结果、统计与下载', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 背景填充发生在绘制人像之前（换底色）
    const canvas = mockCreateCanvas.mock.results[0].value as {
      getContext: () => { fillRect: unknown }
    }
    expect(canvas.getContext().fillRect).toHaveBeenCalled()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件超限显示错误', async () => {
    render(<Tool />)
    const f = makeFile()
    Object.defineProperty(f, 'size', { value: MAX_FILE_SIZE + 1 })
    await upload(f)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('Canvas 上下文不可用时显示错误', async () => {
    mockCreateCanvas.mockImplementationOnce(
      () => ({ width: 1, height: 1, getContext: () => null }) as never,
    )
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用'),
    )
  })

  it('处理中显示进度提示', async () => {
    mockLoadImage.mockImplementationOnce(() => new Promise<never>(() => {}))
    render(<Tool />)
    await upload(makeFile())
    expect(screen.getByTestId('processing')).toBeTruthy()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('规格切自定义：显示宽高输入，未填上传报错，填合法值后成功', async () => {
    render(<Tool />)
    setSelect('opt-spec', 'custom')
    expect(screen.getByTestId('opt-customw')).toBeTruthy()
    expect(screen.getByTestId('opt-customh')).toBeTruthy()
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('请填写'))
    fireEvent.change(screen.getByTestId('opt-customw'), { target: { value: '40' } })
    fireEvent.change(screen.getByTestId('opt-customh'), { target: { value: '60' } })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('底色切自定义：显示颜色选择器，上传成功', async () => {
    render(<Tool />)
    setSelect('opt-bg', 'custom')
    expect(screen.getByTestId('opt-custombg')).toBeTruthy()
    fireEvent.change(screen.getByTestId('opt-custombg'), { target: { value: '#00ff00' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('排版选 5寸相纸：拼版成功，下载文件名为 -layout', async () => {
    render(<Tool />)
    setSelect('opt-layout', '5inch')
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 拼版创建了第二张 canvas（纸张）
    expect(mockCreateCanvas.mock.calls.length).toBeGreaterThan(1)
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-id-photo-1inch-layout\.jpg$/)
  })

  it('照片宽于纸张时排版报错（0 列）', async () => {
    render(<Tool />)
    setSelect('opt-spec', 'custom')
    fireEvent.change(screen.getByTestId('opt-customw'), { target: { value: '400' } })
    fireEvent.change(screen.getByTestId('opt-customh'), { target: { value: '10' } })
    setSelect('opt-layout', '5inch')
    await upload(makeFile())
    // i18n 键合并前只断言结构：报错出现且无结果（该场景唯一可能失败的是拼版检查）
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('照片高于纸张时排版报错（0 行）', async () => {
    render(<Tool />)
    setSelect('opt-spec', 'custom')
    fireEvent.change(screen.getByTestId('opt-customw'), { target: { value: '10' } })
    fireEvent.change(screen.getByTestId('opt-customh'), { target: { value: '400' } })
    setSelect('opt-layout', '5inch')
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('有文件时选项变更重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    setSelect('opt-dpi', '600')
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('缩放滑杆变更触发重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-scale'), { target: { value: '150' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('无文件时选项变更不处理', () => {
    render(<Tool />)
    setSelect('opt-spec', '2inch')
    setSelect('opt-dpi', '150')
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob，文件名含规格', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-id-photo-1inch\.jpg$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
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
    expect(mockLoadImage).not.toHaveBeenCalled()
  })
})
