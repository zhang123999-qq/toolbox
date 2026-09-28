// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 800, height: 600 })),
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

const smallBlob = () => new Blob(['x'.repeat(100)], { type: 'image/jpeg' }) // 100 B：恒达标
const bigBlob = () => new Blob(['x'.repeat(60000)], { type: 'image/jpeg' }) // 60 KB：恒超标

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

async function setTarget(value: string) {
  await act(async () => {
    fireEvent.change(screen.getByTestId('opt-target'), { target: { value } })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => ({ width: 800, height: 600 }) as never)
  mockCanvasToBlob.mockImplementation(async () => smallBlob())
})

describe('compress-size 组件', () => {
  it('渲染投放区、选项与处理按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-target')).toBeTruthy()
    expect(screen.getByTestId('process')).toBeTruthy()
  })

  it('目标大小非法时显示错误', async () => {
    render(<Tool />)
    await setTarget('0')
    // 无文件时改选项不触发处理
    expect(mockLoadImage).not.toHaveBeenCalled()
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('目标大小')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('目标大小超上限时显示错误', async () => {
    render(<Tool />)
    await setTarget('999999')
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('超出范围'))
  })

  it('目标≥原图大小时原样输出、无需压缩', async () => {
    render(<Tool />)
    await setTarget('20') // 20KB > 10KB 原图
    await upload(makeFile('photo.png', 'image/png', 10240))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 跳过压缩：一次编码都没发生
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('一次二分达标：显示尝试次数/质量/尺寸统计', async () => {
    render(<Tool />)
    await setTarget('5') // 5KB < 10KB 原图，触发二分
    await upload(makeFile('photo.png', 'image/png', 10240))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const stats = screen.getByTestId('stats').textContent ?? ''
    // 恒达标时二分走满 50→75→88→94→97→99→100，共 7 次探测
    expect(stats).toContain('尝试 7 次')
    expect(stats).toContain('最终质量 100')
    expect(stats).toContain('最终尺寸 800×600')
    expect(mockDrawScaled).toHaveBeenCalledTimes(1)
  })

  it('质量=1 仍超标时缩小尺寸后重新二分', async () => {
    let calls = 0
    mockCanvasToBlob.mockImplementation(async () => {
      calls += 1
      return calls <= 6 ? bigBlob() : smallBlob()
    })
    render(<Tool />)
    await setTarget('5')
    await upload(makeFile('photo.png', 'image/png', 10240))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 第一轮 6 次探测（50→25→12→5→2→1）全超标，第二轮缩小后 7 次探测达标
    expect(mockDrawScaled).toHaveBeenCalledTimes(2)
    const stats = screen.getByTestId('stats').textContent ?? ''
    expect(stats).toContain('尝试 13 次')
    expect(stats).toContain('669×502') // 800×600 按面积 ×0.7 缩小
  })

  it('三轮缩小仍超标时明确报错而非死循环', async () => {
    mockCanvasToBlob.mockImplementation(async () => bigBlob())
    render(<Tool />)
    await setTarget('5')
    await upload(makeFile('photo.png', 'image/png', 10240))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('无法压缩到目标大小')
    expect(screen.queryByTestId('result')).toBeNull()
    // 原尺寸 + 3 轮缩小 = 4 个尺寸档，每档二分 ≤7 次探测，有限次结束
    expect(mockDrawScaled).toHaveBeenCalledTimes(4)
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件过大显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('huge.png', 'image/png', MAX_FILE_SIZE + 1))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await setTarget('5')
    await upload(makeFile('photo.png', 'image/png', 10240))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    expect(mockCanvasToBlob).toHaveBeenLastCalledWith(
      expect.anything(),
      'image/webp',
      expect.any(Number),
    )
  })

  it('process 按钮手动重新处理', async () => {
    render(<Tool />)
    await setTarget('5')
    await upload(makeFile('photo.png', 'image/png', 10240))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.click(screen.getByTestId('process'))
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('无文件时点击 process 不处理', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('process'))
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-targetsize\.jpg$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
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
