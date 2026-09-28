// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  drawScaled: vi.fn(),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(),
}))

import { drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

let mockGetContext: ReturnType<typeof vi.spyOn>
let mockCtx: {
  drawImage: ReturnType<typeof vi.fn>
  getImageData: ReturnType<typeof vi.fn>
  putImageData: ReturnType<typeof vi.fn>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function makeFile(name = 'a.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function upload(which: 'a' | 'b', file: File) {
  const input = screen.getByTestId(which === 'a' ? 'file-a' : 'file-b') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function uploadBoth() {
  await upload('a', makeFile('a.png'))
  await upload('b', makeFile('b.png'))
}

async function switchToDiff() {
  await act(async () => {
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'diff' } })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  // 按文件名返回不同尺寸：a.png=100x80（基准），b.png=200x160（待缩放对齐）
  mockLoadImage.mockImplementation(async (blob: Blob) => {
    const name = (blob as File).name
    return (name === 'b.png' ? { width: 200, height: 160 } : { width: 100, height: 80 }) as never
  })
  mockDrawScaled.mockImplementation(() => document.createElement('canvas') as never)
  mockCtx = {
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(100 * 80 * 4),
      width: 100,
      height: 80,
    })),
    putImageData: vi.fn(),
  }
  mockGetContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockReturnValue(mockCtx as never)
})

describe('image-compare 组件', () => {
  it('渲染两个投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone-a')).toBeTruthy()
    expect(screen.getByTestId('dropzone-b')).toBeTruthy()
    expect(screen.getByTestId('file-a')).toBeTruthy()
    expect(screen.getByTestId('file-b')).toBeTruthy()
    expect(screen.getByTestId('opt-mode')).toBeTruthy()
    expect(screen.getByTestId('opt-threshold')).toBeTruthy()
    expect(screen.queryByTestId('result-side')).toBeNull()
    expect(screen.queryByTestId('result-diff')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('只上传图 A 时不显示结果', async () => {
    render(<Tool />)
    await upload('a', makeFile('a.png'))
    expect(screen.queryByTestId('result-side')).toBeNull()
    expect(screen.queryByTestId('result-diff')).toBeNull()
    // 有一张图即可重置
    expect(screen.getByTestId('reset')).toBeTruthy()
  })

  it('只上传图 B 时不显示结果', async () => {
    render(<Tool />)
    await upload('b', makeFile('b.png'))
    expect(screen.queryByTestId('result-side')).toBeNull()
    expect(screen.queryByTestId('result-diff')).toBeNull()
  })

  it('两张图 side 模式并排显示', async () => {
    render(<Tool />)
    await uploadBoth()
    await waitFor(() => expect(screen.getByTestId('result-side')).toBeTruthy())
    const imgs = screen.getByTestId('result-side').querySelectorAll('img')
    expect(imgs.length).toBe(2)
    expect(imgs[0].getAttribute('src')).toBe('blob:mock-url')
    expect(imgs[1].getAttribute('src')).toBe('blob:mock-url')
    expect(screen.queryByTestId('result-diff')).toBeNull()
  })

  it('只有图 A 时切 diff 不显示结果', async () => {
    render(<Tool />)
    await upload('a', makeFile('a.png'))
    await switchToDiff()
    expect(screen.queryByTestId('result-diff')).toBeNull()
    expect(screen.queryByTestId('diff-stats')).toBeNull()
  })

  it('只有图 B 时切 diff 不显示结果', async () => {
    render(<Tool />)
    await upload('b', makeFile('b.png'))
    await switchToDiff()
    expect(screen.queryByTestId('result-diff')).toBeNull()
    expect(screen.queryByTestId('diff-stats')).toBeNull()
  })

  it('diff 模式显示差异画布与统计', async () => {
    render(<Tool />)
    await uploadBoth()
    await switchToDiff()
    await waitFor(() => expect(screen.getByTestId('diff-stats')).toBeTruthy())
    expect(screen.getByTestId('diff-canvas')).toBeTruthy()
    expect(screen.getByTestId('diff-overlay')).toBeTruthy()
    // 全零像素 → 0 差异 / 8000 总像素
    const stats = screen.getByTestId('diff-stats').textContent ?? ''
    expect(stats).toContain('8000')
    expect(stats).toContain('0.0%')
    expect(mockCtx.putImageData).toHaveBeenCalled()
    expect(screen.queryByTestId('result-side')).toBeNull()
  })

  it('阈值变更后走像素缓存重算（不再解码）', async () => {
    render(<Tool />)
    await uploadBoth()
    await switchToDiff()
    await waitFor(() => expect(screen.getByTestId('diff-stats')).toBeTruthy())
    const loadCalls = mockLoadImage.mock.calls.length
    const readCalls = mockCtx.getImageData.mock.calls.length
    expect(loadCalls).toBe(2)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-threshold'), { target: { value: '50' } })
    })
    await waitFor(() => expect(screen.getByTestId('diff-stats')).toBeTruthy())
    // 像素缓存命中：loadImageFromBlob 不再被调用，但 overlay 重绘了
    expect(mockLoadImage.mock.calls.length).toBe(loadCalls)
    expect(mockCtx.getImageData.mock.calls.length).toBeGreaterThan(readCalls)
  })

  it('阈值超范围时显示 diff 错误', async () => {
    render(<Tool />)
    await uploadBoth()
    await switchToDiff()
    await waitFor(() => expect(screen.getByTestId('diff-stats')).toBeTruthy())
    await act(async () => {
      // number 输入框填超范围数字触发解析错误
      fireEvent.change(screen.getByTestId('opt-threshold'), { target: { value: '300' } })
    })
    await waitFor(() => expect(screen.getByTestId('diff-error')).toBeTruthy())
    expect(screen.queryByTestId('diff-stats')).toBeNull()
  })

  it('canvas 上下文不可用时显示 diff 错误', async () => {
    render(<Tool />)
    await uploadBoth()
    mockGetContext.mockReturnValueOnce(null)
    await switchToDiff()
    await waitFor(() => expect(screen.getByTestId('diff-error')).toBeTruthy())
    expect(screen.queryByTestId('diff-stats')).toBeNull()
  })

  it('图片加载失败显示 diff 错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await uploadBoth()
    await switchToDiff()
    await waitFor(() => expect(screen.getByTestId('diff-error').textContent).toContain('解码失败'))
  })

  it('图 A 校验失败不影响图 B', async () => {
    render(<Tool />)
    await upload('a', makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error-a')).toBeTruthy())
    await upload('b', makeFile('b.png'))
    expect(screen.queryByTestId('error-b')).toBeNull()
    // 图 A 无效 → 仍不显示结果
    expect(screen.queryByTestId('result-side')).toBeNull()
  })

  it('图 B 传坏文件显示错误', async () => {
    render(<Tool />)
    await upload('b', makeFile('b.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error-b')).toBeTruthy())
    expect(screen.queryByTestId('error-a')).toBeNull()
  })

  it('超 50MB 文件被拒绝', async () => {
    render(<Tool />)
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    await upload('a', big)
    await waitFor(() => expect(screen.getByTestId('error-a')).toBeTruthy())
    expect(screen.queryByTestId('result-side')).toBeNull()
  })

  it('重复上传图 A 槽位会释放旧 object URL', async () => {
    render(<Tool />)
    await upload('a', makeFile('a.png'))
    await upload('a', makeFile('a2.png'))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('重复上传图 B 槽位会释放旧 object URL', async () => {
    render(<Tool />)
    await upload('b', makeFile('b.png'))
    await upload('b', makeFile('b2.png'))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('重置清空状态并释放 URL', async () => {
    render(<Tool />)
    await uploadBoth()
    await waitFor(() => expect(screen.getByTestId('result-side')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result-side')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })

  it('只传图 A 时重置也正常', async () => {
    render(<Tool />)
    await upload('a', makeFile('a.png'))
    fireEvent.click(screen.getByTestId('reset'))
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('只传图 B 时重置也正常', async () => {
    render(<Tool />)
    await upload('b', makeFile('b.png'))
    fireEvent.click(screen.getByTestId('reset'))
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('拖拽高亮与投放（图 A）', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone-a')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile('a.png')] } })
    })
    await waitFor(() => expect(screen.getByTestId('reset')).toBeTruthy())
  })

  it('拖拽高亮（图 B）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone-b')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
  })

  it('投放区为 label 且包含文件输入', () => {
    render(<Tool />)
    for (const id of ['dropzone-a', 'dropzone-b']) {
      const zone = screen.getByTestId(id)
      expect(zone.tagName).toBe('LABEL')
      expect(zone.querySelector('input[type="file"]')).toBeTruthy()
    }
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-a') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } })
    })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('reset')).toBeNull()
  })
})
