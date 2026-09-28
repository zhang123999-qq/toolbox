// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_SIZE } from './utils'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  formatBytes: (n: number) => `${n} B`,
  loadImageFromBlob: vi.fn(),
  readFileAsDataURL: vi.fn(),
}))

import { loadImageFromBlob, readFileAsDataURL } from '../../lib/image'

const mockLoadImage = vi.mocked(loadImageFromBlob)
const mockReadDataURL = vi.mocked(readFileAsDataURL)

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function pngBytes(): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(64)
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  return b
}

function makeFile(
  name = 'photo.png',
  type = 'image/png',
  bytes: Uint8Array<ArrayBuffer> = pngBytes(),
) {
  return new File([bytes], name, { type })
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
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockReadDataURL.mockImplementation(async () => 'data:image/png;base64,preview')
})

describe('image-info 组件', () => {
  it('渲染投放区，初始无信息表', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.queryByTestId('info-table')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('上传合法图片后展示全部元信息行', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('info-table')).toBeTruthy())
    expect(screen.getByTestId('info-name').textContent).toBe('photo.png')
    expect(screen.getByTestId('info-size').textContent).toBe('64 B')
    expect(screen.getByTestId('info-declared').textContent).toBe('PNG')
    expect(screen.getByTestId('info-detected').textContent).toBe('PNG')
    expect(screen.getByTestId('info-dimensions').textContent).toBe('800×600')
    expect(screen.getByTestId('info-ratio').textContent).toBe('4:3')
    expect(screen.getByTestId('info-megapixels').textContent).toBe('0.5 MP')
    // jsdom 无 Canvas 2D 上下文 → 色彩空间未知
    expect(screen.getByTestId('info-colorspace')).toBeTruthy()
    expect(screen.queryByTestId('format-warning')).toBeNull()
    expect(screen.getByTestId('preview')).toBeTruthy()
  })

  it('魔数与声明类型不一致时显示警告', async () => {
    render(<Tool />)
    // PNG 文件头，但扩展名/MIME 声明为 jpeg
    await upload(makeFile('photo.jpg', 'image/jpeg'))
    await waitFor(() => expect(screen.getByTestId('format-warning')).toBeTruthy())
    expect(screen.getByTestId('info-detected').textContent).toBe('PNG')
    expect(screen.getByTestId('info-declared').textContent).toBe('JPG')
  })

  it('魔数未知的文件显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.bin', '', new Uint8Array([1, 2, 3, 4])))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('info-table')).toBeNull()
  })

  it('图片解码失败显示错误（损坏文件）', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
    expect(screen.queryByTestId('info-table')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('声明类型为空时显示未知且无警告', async () => {
    render(<Tool />)
    await upload(makeFile('noext', ''))
    await waitFor(() => expect(screen.getByTestId('info-table')).toBeTruthy())
    expect(screen.getByTestId('info-declared')).toBeTruthy()
    expect(screen.queryByTestId('format-warning')).toBeNull()
  })

  it('Canvas 可用时显示色彩空间 srgb', async () => {
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ getImageData: () => ({ colorSpace: 'srgb' }) } as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('info-table')).toBeTruthy())
    expect(screen.getByTestId('info-colorspace').textContent).toBe('srgb')
    spy.mockRestore()
  })

  it('Canvas 色彩空间为 display-p3 时正确显示', async () => {
    const spy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue({ getImageData: () => ({ colorSpace: 'display-p3' }) } as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('info-table')).toBeTruthy())
    expect(screen.getByTestId('info-colorspace').textContent).toBe('display-p3')
    spy.mockRestore()
  })

  it('Canvas 读取抛错时色彩空间显示未知（不抛错）', async () => {
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('no canvas')
    })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('info-table')).toBeTruthy())
    expect(screen.getByTestId('info-colorspace')).toBeTruthy()
    expect(screen.queryByTestId('error')).toBeNull()
    spy.mockRestore()
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('info-table')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('info-table')).toBeNull()
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
    await waitFor(() => expect(screen.getByTestId('info-table')).toBeTruthy())
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
