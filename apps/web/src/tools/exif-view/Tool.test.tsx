// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('exifr', () => ({ default: { parse: vi.fn() } }))

vi.mock('../../lib/image', () => ({
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/jpeg;base64,preview'),
}))

import exifr from 'exifr'
import { isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockParse = vi.mocked(exifr.parse)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

const FULL_EXIF: Record<string, unknown> = {
  Make: 'Canon',
  Model: 'EOS R5',
  FNumber: 2.8,
  ExposureTime: 0.004,
  ISO: 100,
  FocalLength: 50,
  DateTimeOriginal: new Date(2024, 4, 1, 12, 30, 0),
  Flash: 0,
  ExposureProgram: 3,
  GPSLatitude: 39.9042,
  GPSLongitude: 116.4074,
  GPSAltitude: 42,
  ExifVersion: '0232',
  ColorSpace: 1,
}

afterEach(() => {
  cleanup()
})

function makeFile(name = 'photo.jpg', type = 'image/jpeg', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

function makeOversizeFile() {
  const file = makeFile('big.jpg', 'image/jpeg', 10)
  Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
  return file
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

function rowCount(testId: string) {
  return screen.getByTestId(testId).querySelectorAll('tbody tr').length
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockParse.mockResolvedValue(FULL_EXIF)
})

describe('exif-view 组件', () => {
  it('渲染投放区与文件输入', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
  })

  it('上传含完整 EXIF 的图片后展示四个分类表格', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())

    expect(screen.getByTestId('section-shooting')).toBeTruthy()
    expect(screen.getByTestId('section-gps')).toBeTruthy()
    expect(screen.getByTestId('section-file')).toBeTruthy()
    expect(screen.getByTestId('section-others')).toBeTruthy()

    expect(rowCount('table-shooting')).toBe(9)
    expect(rowCount('table-gps')).toBe(3)
    expect(rowCount('table-file')).toBe(4)
    expect(rowCount('table-others')).toBe(2)

    // 格式化后的值出现在表格中
    const shooting = screen.getByTestId('table-shooting').textContent ?? ''
    expect(shooting).toContain('f/2.8')
    expect(shooting).toContain('1/250 s')
    expect(shooting).toContain('50 mm')
    const gps = screen.getByTestId('table-gps').textContent ?? ''
    expect(gps).toContain('39.9042°N')
    expect(gps).toContain('39°54′15.1″N')
    expect(gps).toContain('42 m')
    const file = screen.getByTestId('table-file').textContent ?? ''
    expect(file).toContain('photo.jpg')
    expect(file).toContain('800 × 600')

    // 预览图
    expect(screen.getByTestId('preview')).toBeTruthy()
    // 文件名显示在投放区
    expect(screen.getByTestId('dropzone').textContent).toContain('photo.jpg')
  })

  it('无 GPS 数据时不渲染 GPS 分组', async () => {
    mockParse.mockResolvedValueOnce({ Make: 'Canon', ExifVersion: '0232' })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('section-gps')).toBeNull()
    expect(screen.getByTestId('section-shooting')).toBeTruthy()
  })

  it('parse 返回空对象时显示无 EXIF 友好提示', async () => {
    mockParse.mockResolvedValueOnce({})
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('no-exif')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('parse 返回 undefined 时显示无 EXIF 友好提示', async () => {
    mockParse.mockResolvedValueOnce(undefined)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('no-exif')).toBeTruthy())
  })

  it('parse 抛错时显示错误', async () => {
    mockParse.mockRejectedValueOnce(new Error('boom'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('boom')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    await upload(makeOversizeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockParse).not.toHaveBeenCalled()
  })

  it('图片解码失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('解码失败')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('无 EXIF 提示后也可重置', async () => {
    mockParse.mockResolvedValueOnce({})
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('no-exif')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('no-exif')).toBeNull()
  })

  it('初始无结果时不显示重置按钮', () => {
    render(<Tool />)
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    const file = makeFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockParse).not.toHaveBeenCalled()
  })
})
