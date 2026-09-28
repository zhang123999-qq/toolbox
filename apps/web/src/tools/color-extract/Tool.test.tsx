// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  drawScaled: vi.fn(),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
}))

import { drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

afterEach(() => {
  cleanup()
})

/** 100×100 像素：6000 红 + 4000 绿 */
function makePixelData(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(100 * 100 * 4)
  for (let i = 0; i < 100 * 100; i++) {
    const o = i * 4
    if (i < 6000) {
      data[o] = 255
    } else {
      data[o + 1] = 255
    }
    data[o + 3] = 255
  }
  return data
}

function fakeCanvas() {
  return {
    width: 100,
    height: 100,
    getContext: () => ({ getImageData: () => ({ data: makePixelData() }) }),
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

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => fakeCanvas() as never)
  // jsdom 无 clipboard API，这里 mock（成功与拒绝两种行为由用例分别指定）
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(async () => {}) },
    configurable: true,
  })
})

describe('color-extract 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-count')).toBeTruthy()
  })

  it('上传合法图片后显示色卡（按占比排序）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('palette')).toBeTruthy())
    const swatches = screen.getAllByTestId('swatch')
    expect(swatches).toHaveLength(2)
    expect(swatches[0].textContent).toContain('#ff0000')
    expect(swatches[1].textContent).toContain('#00ff00')
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockDrawScaled).toHaveBeenCalled()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('palette')).toBeNull()
  })

  it('文件过大显示错误', async () => {
    render(<Tool />)
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 })
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('颜色数量非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-count'), { target: { value: '99' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('Canvas 上下文不可用显示错误', async () => {
    mockDrawScaled.mockImplementationOnce(() => ({ getContext: () => null }) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('palette')).toBeTruthy())
    const calls = mockLoadImage.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-count'), { target: { value: '8' } })
    await waitFor(() => expect(mockLoadImage.mock.calls.length).toBeGreaterThan(calls))
  })

  it('无文件时选项变更不重新处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-count'), { target: { value: '8' } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('点击色块复制 HEX 并显示已复制', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('palette')).toBeTruthy())
    const writeText = vi.mocked(navigator.clipboard.writeText)
    await act(async () => {
      fireEvent.click(screen.getAllByTestId('swatch')[0])
    })
    expect(writeText).toHaveBeenCalledWith('#ff0000')
    await waitFor(() => expect(screen.getByTestId('copied')).toBeTruthy())
    expect(screen.getByTestId('copied').textContent).toContain('#ff0000')
  })

  it('复制失败显示错误', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('palette')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getAllByTestId('swatch')[0])
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('palette')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('palette')).toBeNull()
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
    await waitFor(() => expect(screen.getByTestId('palette')).toBeTruthy())
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
