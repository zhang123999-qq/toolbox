// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  drawScaled: vi.fn((...args: unknown[]) => {
    const dstW = args[3] as number
    const dstH = args[4] as number
    const data = new Uint8ClampedArray(dstW * dstH * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 200
      data[i + 1] = 100
      data[i + 2] = 50
      data[i + 3] = 255
    }
    return {
      width: dstW,
      height: dstH,
      getContext: () => ({ getImageData: () => ({ data }) }),
    }
  }),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 100, height: 40 })),
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

/**
 * 小尺寸上传：先把字符宽度设为 10（100x40 图片 → 10 列 x 2 行 = 20 个 span），
 * 避免 jsdom 渲染数千个着色 span 拖慢用例。
 */
async function uploadSmall(file: File) {
  await act(async () => {
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '10' } })
  })
  await upload(file)
}

function fakeCanvasImpl(...args: unknown[]) {
  const dstW = args[3] as number
  const dstH = args[4] as number
  const data = new Uint8ClampedArray(dstW * dstH * 4)
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 200
    data[i + 1] = 100
    data[i + 2] = 50
    data[i + 3] = 255
  }
  return {
    width: dstW,
    height: dstH,
    getContext: () => ({ getImageData: () => ({ data }) }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 100, height: 40 }) as never)
  mockDrawScaled.mockImplementation(fakeCanvasImpl as never)
})

describe('image-to-ascii 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-width')).toBeTruthy()
    expect(screen.getByTestId('opt-charset')).toBeTruthy()
    expect(screen.getByTestId('opt-invert')).toBeTruthy()
    expect(screen.getByTestId('opt-color')).toBeTruthy()
  })

  it('上传合法图片后按字符高宽比 2:1 下采样', async () => {
    // 400x100 图片，默认 80 列 → 行 = 100/400*80/2 = 10
    mockLoadImage.mockImplementationOnce(async () => ({ width: 400, height: 100 }) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('ascii-preview')).toBeTruthy()
    // 默认彩色模式：字符被 span 着色
    expect(screen.getByTestId('ascii-preview').querySelector('span')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockDrawScaled).toHaveBeenCalled()
    const last = mockDrawScaled.mock.calls[mockDrawScaled.mock.calls.length - 1]
    expect(last[3]).toBe(80)
    expect(last[4]).toBe(10)
  })

  it('关闭彩色模式后渲染纯文本预览', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-color'))
    await uploadSmall(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('ascii-preview').querySelector('span')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('宽度非法时显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 5 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '5' } })
    })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('canvas 上下文缺失显示错误', async () => {
    mockDrawScaled.mockImplementationOnce(() => ({ getContext: () => null }) as never)
    render(<Tool />)
    await uploadSmall(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await uploadSmall(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await uploadSmall(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockDrawScaled.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-charset'), { target: { value: 'blocks' } })
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBeGreaterThan(calls))
  })

  it('单行彩色预览渲染正常', async () => {
    mockLoadImage.mockImplementationOnce(async () => ({ width: 800, height: 1 }) as never)
    render(<Tool />)
    await uploadSmall(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('ascii-preview').querySelector('span')).toBeTruthy()
  })

  it('反色开关可切换', () => {
    render(<Tool />)
    const box = screen.getByTestId('opt-invert') as HTMLInputElement
    fireEvent.click(box)
    expect(box.checked).toBe(true)
    fireEvent.click(box)
    expect(box.checked).toBe(false)
  })

  it('彩色模式下载 HTML，纯文本模式下载 TXT', async () => {
    render(<Tool />)
    await uploadSmall(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [htmlBlob, htmlName] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(htmlBlob.type).toBe('text/html;charset=utf-8')
    expect(htmlName).toMatch(/photo-ascii\.html$/)

    // 关闭彩色模式 → 重新处理 → 下载 TXT
    const calls = mockDrawScaled.mock.calls.length
    fireEvent.click(screen.getByTestId('opt-color'))
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBeGreaterThan(calls))
    fireEvent.click(screen.getByTestId('download'))
    const [txtBlob, txtName] = mockDownloadBlob.mock.calls[1] as [Blob, string]
    expect(txtBlob.type).toBe('text/plain;charset=utf-8')
    expect(txtName).toMatch(/photo-ascii\.txt$/)

    // 重新打开彩色模式（覆盖开关 'on' 分支）
    const colorBox = screen.getByTestId('opt-color') as HTMLInputElement
    const calls2 = mockDrawScaled.mock.calls.length
    fireEvent.click(colorBox)
    await waitFor(() => expect(mockDrawScaled.mock.calls.length).toBeGreaterThan(calls2))
    expect(colorBox.checked).toBe(true)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await uploadSmall(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '10' } })
    })
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
