// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['resized'], { type: 'image/jpeg' })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 400, height: 300 })),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
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

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** 模式单选：0=按像素，1=按百分比 */
function modeRadios() {
  return within(screen.getByTestId('opt-mode')).getAllByRole('radio')
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => ({ width: 400, height: 300 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['c'], { type: 'image/jpeg' }))
})

describe('image-resize 组件', () => {
  it('渲染投放区与选项（默认像素模式）', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-mode')).toBeTruthy()
    expect(screen.getByTestId('opt-width')).toBeTruthy()
    expect(screen.getByTestId('opt-height')).toBeTruthy()
    expect(screen.getByTestId('opt-lock')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    // 像素模式下不显示百分比输入
    expect(screen.queryByTestId('opt-percent')).toBeNull()
  })

  it('上传成功（默认像素模式+锁定，宽高留空=原图尺寸）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockDrawScaled).toHaveBeenCalledWith(expect.anything(), 800, 600, 800, 600)
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('锁定纵横比：改宽自动联动高（按原图比例）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '400' } })
    })
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('300')
  })

  it('锁定纵横比：改高自动联动宽（按原图比例）', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-height'), { target: { value: '150' } })
    })
    expect((screen.getByTestId('opt-width') as HTMLInputElement).value).toBe('200')
  })

  it('取消锁定后改宽不再联动，重新锁定恢复联动', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const lock = screen.getByTestId('opt-lock')
    fireEvent.click(lock)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '400' } })
    })
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('')
    // 未锁定直取：输出宽 400、高沿用原图 600
    expect(mockDrawScaled).toHaveBeenCalledWith(expect.anything(), 800, 600, 400, 600)
    fireEvent.click(lock)
    await act(async () => {
      // 换一个不同的值触发 onChange（值不变时 React 不触发）
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '500' } })
    })
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('375')
  })

  it('锁定下宽输入超限时不联动且报错', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '99999' } })
    })
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('')
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('锁定下清空宽度不联动', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-height'), { target: { value: '150' } })
    })
    expect((screen.getByTestId('opt-width') as HTMLInputElement).value).toBe('200')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '' } })
    })
    // 清空宽：不联动，高保持上次联动值
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('150')
  })

  it('锁定下清空高度不联动', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-height'), { target: { value: '150' } })
    })
    expect((screen.getByTestId('opt-width') as HTMLInputElement).value).toBe('200')
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-height'), { target: { value: '' } })
    })
    // 清空高：不联动，宽保持上次联动值
    expect((screen.getByTestId('opt-width') as HTMLInputElement).value).toBe('200')
  })

  it('无原图时改宽高不联动不报错', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '400' } })
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('')
    expect(screen.queryByTestId('error')).toBeNull()
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('百分比模式：切换并按 50% 缩放', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(modeRadios()[1])
    expect(screen.getByTestId('opt-percent')).toBeTruthy()
    expect(screen.queryByTestId('opt-width')).toBeNull()
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-percent'), { target: { value: '50' } })
    })
    await waitFor(() =>
      expect(mockDrawScaled).toHaveBeenCalledWith(expect.anything(), 800, 600, 400, 300),
    )
    // 切回像素模式
    fireEvent.click(modeRadios()[0])
    expect(screen.getByTestId('opt-width')).toBeTruthy()
    expect(screen.queryByTestId('opt-percent')).toBeNull()
  })

  it('百分比非法时报错', async () => {
    render(<Tool />)
    fireEvent.click(modeRadios()[1])
    fireEvent.change(screen.getByTestId('opt-percent'), { target: { value: '1001' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('宽高超限报错', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '16385' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('质量非法时报错', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 101 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-800x600\.jpg$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    // 重置后原图尺寸清空，改宽不再联动
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '400' } })
    expect((screen.getByTestId('opt-height') as HTMLInputElement).value).toBe('')
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
