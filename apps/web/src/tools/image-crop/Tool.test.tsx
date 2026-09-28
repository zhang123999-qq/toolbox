// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

const mockDrawImage = vi.fn()

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['cropped'], { type: 'image/jpeg' })),
  createCanvas: vi.fn(),
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

/** 默认 canvas mock：getContext 返回带 drawImage 的假 2d 上下文 */
function mockCanvas2d() {
  mockCreateCanvas.mockImplementation(((w: number, h: number) => ({
    width: w,
    height: h,
    getContext: () => ({ drawImage: mockDrawImage }),
  })) as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockCanvas2d()
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/jpeg' }))
})

describe('image-crop 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-aspect')).toBeTruthy()
    expect(screen.getByTestId('opt-x')).toBeTruthy()
    expect(screen.getByTestId('opt-y')).toBeTruthy()
    expect(screen.getByTestId('opt-width')).toBeTruthy()
    expect(screen.getByTestId('opt-height')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('上传合法图片后显示结果、遮罩与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 首次上传默认最大区域：遮罩覆盖整图
    const mask = screen.getByTestId('crop-mask') as HTMLElement
    expect(mask.style.left).toBe('0%')
    expect(mask.style.top).toBe('0%')
    expect(mask.style.width).toBe('100%')
    expect(mask.style.height).toBe('100%')
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 按整图矩形裁剪
    expect(mockDrawImage).toHaveBeenCalledWith(
      { width: 800, height: 600 },
      0,
      0,
      800,
      600,
      0,
      0,
      800,
      600,
    )
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('裁剪参数超限时显示错误且隐藏遮罩', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      // number 输入框无法填入非数字，用超范围数字触发 parseCropNumber 抛错
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '99999' } })
    })
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('裁剪参数过大'))
    expect(screen.queryByTestId('crop-mask')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('质量非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // 无文件时只更新选项不处理，覆盖无文件分支
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('超出范围'))
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('Canvas 上下文不可用时显示错误', async () => {
    mockCreateCanvas.mockReturnValueOnce({ getContext: () => null } as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用'),
    )
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('裁剪宽度变更触发重新处理并更新遮罩', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '400' } })
    })
    await waitFor(() => {
      const mask = screen.getByTestId('crop-mask') as HTMLElement
      expect(mask.style.width).toBe('50%')
    })
    expect(mockDrawImage).toHaveBeenCalledWith(
      { width: 800, height: 600 },
      0,
      0,
      400,
      600,
      0,
      0,
      400,
      600,
    )
  })

  it('裁剪坐标与高度变更触发重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-x'), { target: { value: '100' } })
    })
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-y'), { target: { value: '50' } })
    })
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-height'), { target: { value: '300' } })
    })
    // 矩形 (100,50,700,300)：宽按 800-100 钳制为 700
    await waitFor(() =>
      expect(mockDrawImage).toHaveBeenCalledWith(
        { width: 800, height: 600 },
        100,
        50,
        700,
        300,
        0,
        0,
        700,
        300,
      ),
    )
    const mask = screen.getByTestId('crop-mask') as HTMLElement
    expect(mask.style.left).toBe('12.5%')
    expect(mask.style.top).toBe(`${(50 / 600) * 100}%`)
    expect(mask.style.width).toBe('87.5%')
    expect(mask.style.height).toBe('50%')
  })

  it('纵横比预设按当前矩形重算（由宽算高、居中）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '400' } })
    })
    // 当前矩形 (0,0,400,600) → 1:1：宽 400 → 高 400，中心 (200,300) → (0,100,400,400)
    fireEvent.change(screen.getByTestId('opt-aspect'), { target: { value: '1:1' } })
    expect((screen.getByTestId('opt-y') as HTMLInputElement).value).toBe('100')
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('400')
  })

  it('纵横比切换时矩形非法则只切换预设、保留原值', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '99999' } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    fireEvent.change(screen.getByTestId('opt-aspect'), { target: { value: '16:9' } })
    expect((screen.getByTestId('opt-width') as HTMLInputElement).value).toBe('99999')
    expect((screen.getByTestId('opt-aspect') as HTMLSelectElement).value).toBe('16:9')
  })

  it('无原图时切换纵横比只更新预设', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-aspect'), { target: { value: '1:1' } })
    expect((screen.getByTestId('opt-aspect') as HTMLSelectElement).value).toBe('1:1')
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('快捷按钮：居中正方形', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('quick-center-square'))
    // 800x600 → 边长 600，x=100，y=0
    expect((screen.getByTestId('opt-x') as HTMLInputElement).value).toBe('100')
    expect((screen.getByTestId('opt-width') as HTMLInputElement).value).toBe('600')
    await waitFor(() =>
      expect(mockDrawImage).toHaveBeenCalledWith(
        { width: 800, height: 600 },
        100,
        0,
        600,
        600,
        0,
        0,
        600,
        600,
      ),
    )
  })

  it('快捷按钮：最大区域', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('quick-center-square'))
    fireEvent.click(screen.getByTestId('quick-max'))
    expect((screen.getByTestId('opt-x') as HTMLInputElement).value).toBe('0')
    expect((screen.getByTestId('opt-width') as HTMLInputElement).value).toBe('800')
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('600')
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-cropped\.jpg$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('crop-mask')).toBeNull()
    expect(screen.queryByTestId('quick-center-square')).toBeNull()
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

  it('空拖拽不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: [] } })
    expect(mockLoadImage).not.toHaveBeenCalled()
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
