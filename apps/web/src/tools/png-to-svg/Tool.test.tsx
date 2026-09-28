// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

import { downloadBlob, drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

afterEach(() => {
  cleanup()
})

/** 4x4 纯红像素（每行 1 个整行矩形，面积恰为 4） */
function red4x4(): Uint8ClampedArray {
  const data = new Uint8ClampedArray(4 * 4 * 4)
  for (let i = 0; i < 16; i++) {
    data[i * 4] = 255
    data[i * 4 + 3] = 255
  }
  return data
}

function makeFile(name = 'logo.png', type = 'image/png', size = 1024) {
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
  mockLoadImage.mockImplementation(async () => ({ width: 4, height: 4 }) as never)
  mockDrawScaled.mockImplementation(
    () =>
      ({
        width: 4,
        height: 4,
        getContext: () => ({
          getImageData: () => ({ data: red4x4(), width: 4, height: 4 }),
        }),
      }) as never,
  )
})

describe('png-to-svg 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-colors')).toBeTruthy()
    expect(screen.getByTestId('opt-maxedge')).toBeTruthy()
    expect(screen.getByTestId('opt-minarea')).toBeTruthy()
    expect(screen.getByTestId('opt-keepbg')).toBeTruthy()
  })

  it('上传合法图片后显示结果、统计与下载按钮', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockDrawScaled).toHaveBeenCalled()
    // 预览图：原图 dataURL + SVG blob URL
    const imgs = screen.getByTestId('result').querySelectorAll('img')
    expect(imgs).toHaveLength(2)
  })

  it('处理中显示加载态', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile()] } })
    // processFile 同步段已执行 setProcessing(true)，异步计算尚未开始
    expect(screen.queryByTestId('processing')).toBeTruthy()
    return waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('默认丢弃背景层：SVG 不含 path；保留背景开时含 path', async () => {
    // 默认 keepBackground=off：4x4 纯红只有一层且被丢弃 → 无 path
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    const offBlob = mockDownloadBlob.mock.calls[0][0] as Blob
    expect(await offBlob.text()).not.toContain('<path')
    cleanup()
    mockDownloadBlob.mockClear()

    // keepBackground=on：红色层保留 → 有 path
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-keepbg'), { target: { value: 'on' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    const onBlob = mockDownloadBlob.mock.calls[0][0] as Blob
    const svg = await onBlob.text()
    expect(svg).toContain('<path fill="#ff0000"')
    expect(svg).toContain('viewBox="0 0 4 4"')
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件过大显示错误', async () => {
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1, configurable: true })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('最大边非法时显示错误', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      // 1025 超出 64–1024 上限，触发重新处理并报错
      fireEvent.change(screen.getByTestId('opt-maxedge'), { target: { value: '1025' } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('Canvas 上下文缺失显示错误', async () => {
    mockDrawScaled.mockImplementationOnce(
      () => ({ width: 4, height: 4, getContext: () => null }) as never,
    )
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('颜色数/最小色块变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockDrawScaled.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-colors'), { target: { value: '2' } })
      fireEvent.change(screen.getByTestId('opt-minarea'), { target: { value: '1' } })
    })
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBeGreaterThan(calls))
  })

  it('下载按钮调用 downloadBlob 且文件名为 -vector.svg', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/logo-vector\.svg$/)
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
