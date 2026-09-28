// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(),
  createCanvas: vi.fn(),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn(),
  loadImageFromBlob: vi.fn(),
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

/** 每个用例重建 ctx mock，便于断言 translate/scale/drawImage 的调用参数 */
let ctxMocks: { translate: Mock; scale: Mock; drawImage: Mock }

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

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  ctxMocks = { translate: vi.fn(), scale: vi.fn(), drawImage: vi.fn() }
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockCreateCanvas.mockImplementation(
    () => ({ getContext: () => ctxMocks, width: 800, height: 600 }) as never,
  )
  mockCanvasToBlob.mockImplementation(async () => new Blob(['f'], { type: 'image/jpeg' }))
})

describe('image-flip 组件', () => {
  it('渲染投放区与选项，默认勾选水平翻转', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect((screen.getByTestId('opt-h') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('opt-v') as HTMLInputElement).checked).toBe(false)
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
  })

  it('上传合法图片后显示结果与统计（默认水平翻转）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 800x600 图片水平翻转：平移到中心 → scale(-1,1) → 以中心为原点绘制
    expect(ctxMocks.translate).toHaveBeenCalledWith(400, 300)
    expect(ctxMocks.scale).toHaveBeenCalledWith(-1, 1)
    expect(ctxMocks.drawImage).toHaveBeenCalledWith(
      expect.objectContaining({ width: 800, height: 600 }),
      -400,
      -300,
      800,
      600,
    )
  })

  it('取消全选后报错而不是静默输出原图', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 取消最后一个勾选 → 重新处理 → 校验抛错
    fireEvent.click(screen.getByTestId('opt-h'))
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('请至少选择一种翻转方式'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('垂直翻转调用 scale(1, -1)', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('opt-h')) // 取消水平（此时全不选，报错是预期的）
    fireEvent.click(screen.getByTestId('opt-v')) // 勾选垂直 → 重新处理成功
    await waitFor(() => expect(ctxMocks.scale).toHaveBeenLastCalledWith(1, -1))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('同时勾选两种翻转 = 旋转 180°，scale(-1, -1)', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('opt-v')) // 此时水平 + 垂直都勾选
    await waitFor(() => expect(ctxMocks.scale).toHaveBeenLastCalledWith(-1, -1))
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('质量非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 101 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('Canvas 上下文不可用时报错', async () => {
    mockCreateCanvas.mockImplementationOnce(() => ({ getContext: () => null }) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用'),
    )
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('无文件时选项变更不触发处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-flipped\.jpg$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    // 无文件的 drop 不处理
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: {} })
    })
    expect(mockLoadImage).not.toHaveBeenCalled()
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
