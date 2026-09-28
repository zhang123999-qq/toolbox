// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE, hammingDistance, similarityText } from './utils'

vi.mock('../../lib/image', () => ({
  drawScaled: vi.fn(),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

import { drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

afterEach(() => {
  cleanup()
})

function makeFile(name = 'a.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

/** 构造 32×32 RGBA 像素：fillGray 为灰度值（r=g=b=灰度） */
function pixelData(fillGray: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(32 * 32 * 4)
  for (let i = 0; i < 32 * 32; i++) {
    data[i * 4] = fillGray
    data[i * 4 + 1] = fillGray
    data[i * 4 + 2] = fillGray
    data[i * 4 + 3] = 255
  }
  return data
}

function fakeCanvas(data: Uint8ClampedArray) {
  return {
    getContext: () => ({
      getImageData: () => ({ data }),
    }),
  }
}

async function upload(file: File, slot: 'a' | 'b' = 'a') {
  const input = screen.getByTestId(
    slot === 'a' ? 'file-input-a' : 'file-input-b',
  ) as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** drawScaled 返回的像素由该变量控制，测试中可切换 A/B 图内容 */
let currentPixels: Uint8ClampedArray

/** 从 data-testid 元素文本中提取 16 位 hex 哈希 */
function hashOf(testId: string): string {
  const text = screen.getByTestId(testId).textContent ?? ''
  const m = /[0-9a-f]{16}/.exec(text)
  if (m === null) throw new Error(`未找到哈希：${testId}`)
  return m[0]
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 64, height: 64 }) as never)
  currentPixels = pixelData(0)
  mockDrawScaled.mockImplementation(() => fakeCanvas(currentPixels) as never)
})

describe('image-hash 组件', () => {
  it('渲染两个投放区与文件输入', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone-a')).toBeTruthy()
    expect(screen.getByTestId('dropzone-b')).toBeTruthy()
    expect(screen.getByTestId('file-input-a')).toBeTruthy()
    expect(screen.getByTestId('file-input-b')).toBeTruthy()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('上传图片 A 后显示三种 16 位 hex 哈希', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('hash-ahash')).toBeTruthy())
    // 全黑像素：三种哈希均为全 0
    expect(screen.getByTestId('hash-ahash').textContent).toContain('0000000000000000')
    expect(screen.getByTestId('hash-dhash').textContent).toContain('0000000000000000')
    expect(screen.getByTestId('hash-phash').textContent).toContain('0000000000000000')
    expect(screen.getByTestId('reset')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
  })

  it('仅上传图片 B 也显示其哈希，且无相似度区', async () => {
    render(<Tool />)
    await upload(makeFile('b.png'), 'b')
    await waitFor(() => expect(screen.getByTestId('hash-b-ahash')).toBeTruthy())
    expect(screen.getByTestId('hash-b-dhash')).toBeTruthy()
    expect(screen.getByTestId('hash-b-phash')).toBeTruthy()
    expect(screen.queryByTestId('hash-ahash')).toBeNull()
    expect(screen.queryByTestId('similarity')).toBeNull()
  })

  it('双图显示 Hamming 距离与相似度', async () => {
    render(<Tool />)
    await upload(makeFile('a.png'))
    await waitFor(() => expect(screen.getByTestId('hash-ahash')).toBeTruthy())
    const aHashes = [hashOf('hash-ahash'), hashOf('hash-dhash'), hashOf('hash-phash')]
    // B 图换成全白像素
    currentPixels = pixelData(255)
    await upload(makeFile('b.png'), 'b')
    await waitFor(() => expect(screen.getByTestId('similarity')).toBeTruthy())
    const bHashes = [hashOf('hash-b-ahash'), hashOf('hash-b-dhash'), hashOf('hash-b-phash')]
    // 全黑 vs 全白：aHash/dHash 均为全 0 → 距离 0、相似度 100.0%
    expect(aHashes[0]).toBe('0000000000000000')
    expect(bHashes[0]).toBe('0000000000000000')
    expect(aHashes[1]).toBe('0000000000000000')
    expect(bHashes[1]).toBe('0000000000000000')
    // pHash 对亮度敏感，两图哈希不同
    expect(bHashes[2]).not.toBe(aHashes[2])
    // 每行显示的距离与相似度，与用 utils 对展示哈希重算的结果一致
    const keys = ['ahash', 'dhash', 'phash']
    for (let i = 0; i < keys.length; i++) {
      const dist = hammingDistance(aHashes[i], bHashes[i])
      const row = screen.getByTestId(`similarity-${keys[i]}`).textContent ?? ''
      expect(row).toContain(String(dist))
      expect(row).toContain(similarityText(dist))
    }
    expect(screen.getByTestId('similarity-ahash').textContent).toContain('100.0%')
  })

  it('移除图片 B 后相似度区消失', async () => {
    render(<Tool />)
    await upload(makeFile('a.png'))
    await waitFor(() => expect(screen.getByTestId('hash-ahash')).toBeTruthy())
    await upload(makeFile('b.png'), 'b')
    await waitFor(() => expect(screen.getByTestId('similarity')).toBeTruthy())
    fireEvent.click(screen.getByTestId('remove-b'))
    expect(screen.queryByTestId('similarity')).toBeNull()
    expect(screen.queryByTestId('hash-b-ahash')).toBeNull()
    // A 图保留
    expect(screen.getByTestId('hash-ahash')).toBeTruthy()
  })

  it('图片 A 加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
    expect(screen.queryByTestId('hash-ahash')).toBeNull()
  })

  it('图片 B 加载失败显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.png'))
    await waitFor(() => expect(screen.getByTestId('hash-ahash')).toBeTruthy())
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    await upload(makeFile('b.png'), 'b')
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('hash-b-ahash')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('hash-ahash')).toBeNull()
  })

  it('文件过大显示错误', async () => {
    render(<Tool />)
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('Canvas 上下文不可用显示错误', async () => {
    mockDrawScaled.mockImplementationOnce(() => ({ getContext: () => null }) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('hash-ahash')).toBeNull()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input-a') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('drop 的 files 为 null 时不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone-a')
    fireEvent.drop(zone, { dataTransfer: { files: null } as unknown as DataTransfer })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('拖拽高亮与 drop 上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone-a')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    const file = makeFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('hash-ahash')).toBeTruthy())
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone-b')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile('a.png'))
    await waitFor(() => expect(screen.getByTestId('hash-ahash')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('hash-ahash')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })
})
