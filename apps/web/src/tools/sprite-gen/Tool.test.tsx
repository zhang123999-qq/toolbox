// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['sprite'], { type: 'image/png' })),
  createCanvas: vi.fn(() => ({
    getContext: () => ({ drawImage: vi.fn() }),
  })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 100, height: 50 })),
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

const DIMS: Record<string, { width: number; height: number }> = {
  'a.png': { width: 100, height: 50 },
  'b.png': { width: 60, height: 80 },
  'c.png': { width: 40, height: 40 },
}

const writeText = vi.fn()
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  writeText.mockReset()
  writeText.mockResolvedValue(undefined)
  // jsdom 默认没有 clipboard，按任务要求用 defineProperty 装上，afterEach 恢复
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async (blob: Blob) => {
    const dims = DIMS[(blob as File).name]
    return (dims === undefined ? { width: 100, height: 50 } : dims) as never
  })
  mockCreateCanvas.mockImplementation(
    () => ({ getContext: () => ({ drawImage: vi.fn() }) }) as never,
  )
  mockCanvasToBlob.mockImplementation(async () => new Blob(['sprite'], { type: 'image/png' }))
})

afterEach(() => {
  cleanup()
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  else Reflect.deleteProperty(navigator, 'clipboard')
})

function makeFile(name: string, type = 'image/png', size = 1024) {
  return new File([new Uint8Array(size)], name, { type })
}

async function uploadFiles(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

describe('sprite-gen 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-direction')).toBeTruthy()
    expect(screen.getByTestId('opt-columns')).toBeTruthy()
    expect(screen.getByTestId('opt-gap')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('多图上传生成雪碧图与坐标文本', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 横向：总宽 100+60=160，总高 max(50,80)=80
    expect(mockCreateCanvas).toHaveBeenCalledWith(160, 80)
    expect(mockCanvasToBlob).toHaveBeenCalled()
    const json = (screen.getByTestId('sprite-json') as HTMLTextAreaElement).value
    expect(json).toContain('"name": "b.png"')
    expect(json).toContain('"x": 100')
    expect(json).toContain('"y": 0')
    const css = (screen.getByTestId('sprite-css') as HTMLTextAreaElement).value
    expect(css).toContain(
      '.b { width: 60px; height: 80px; background: url(sprite.png) -100px -0px; }',
    )
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('file-list')).toBeTruthy()
  })

  it('选项变更自动重拼（纵向）', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-direction'), { target: { value: 'vertical' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    // 纵向：总宽 max(100,60)=100，总高 50+80=130
    expect(mockCreateCanvas).toHaveBeenLastCalledWith(100, 130)
    const json = (screen.getByTestId('sprite-json') as HTMLTextAreaElement).value
    expect(json).toContain('"y": 50')
  })

  it('网格布局按列数重拼', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-direction'), { target: { value: 'grid' } })
    })
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-columns'), { target: { value: '2' } })
    })
    await waitFor(() => expect(mockCreateCanvas).toHaveBeenLastCalledWith(160, 120))
    // 列宽 [100, 60]，行高 [80, 40]；c.png 在第二行
    const json = (screen.getByTestId('sprite-json') as HTMLTextAreaElement).value
    expect(json).toContain('"name": "c.png"')
    expect(json).toContain('"y": 80')
  })

  it('间距选项变更触发重拼', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-gap'), { target: { value: '10' } })
    })
    // 横向 + 间距 10：总宽 100+60+10=170
    await waitFor(() => expect(mockCreateCanvas).toHaveBeenLastCalledWith(170, 80))
  })

  it('拼合中显示处理提示', async () => {
    let resolveBlob: ((b: Blob) => void) | null = null
    mockCanvasToBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((res) => {
          resolveBlob = res
        }),
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png')] } })
    })
    expect(screen.getByTestId('processing')).toBeTruthy()
    await act(async () => {
      resolveBlob!(new Blob(['x'], { type: 'image/png' }))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('复制 JSON 成功显示提示', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-json'))
    })
    await waitFor(() => expect(screen.getByTestId('copy-json-tip')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith(
      (screen.getByTestId('sprite-json') as HTMLTextAreaElement).value,
    )
  })

  it('复制 JSON 失败显示错误提示', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-json'))
    })
    await waitFor(() => expect(screen.getByTestId('copy-json-tip')).toBeTruthy())
  })

  it('复制 CSS 成功显示提示', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-css'))
    })
    await waitFor(() => expect(screen.getByTestId('copy-css-tip')).toBeTruthy())
    expect(writeText).toHaveBeenCalledWith(
      (screen.getByTestId('sprite-css') as HTMLTextAreaElement).value,
    )
  })

  it('复制 CSS 失败显示错误提示', async () => {
    writeText.mockRejectedValueOnce(new Error('denied'))
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-css'))
    })
    await waitFor(() => expect(screen.getByTestId('copy-css-tip')).toBeTruthy())
  })

  it('删除单张后不足 2 张显示提示并释放链接', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('remove-1'))
    })
    await waitFor(() => expect(screen.getByTestId('need-more')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('清空重置状态', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('need-more')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('单张图片显示需要更多提示', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png')])
    await waitFor(() => expect(screen.getByTestId('need-more')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('清空单张（无结果时）', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png')])
    await waitFor(() => expect(screen.getByTestId('need-more')).toBeTruthy())
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('file-list')).toBeNull()
    expect(screen.queryByTestId('need-more')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.txt', 'text/plain')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await uploadFiles([big])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件过大')
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('解码失败')
    // 仅剩 1 张有效图，不足拼合
    await waitFor(() => expect(screen.getByTestId('need-more')).toBeTruthy())
  })

  it('Canvas 不可用显示错误', async () => {
    mockCreateCanvas.mockImplementationOnce(() => ({ getContext: () => null }) as never)
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用')
  })

  it('质量非法显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      // number 输入框无法填入非数字，用 101 触发超范围错误
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('超出范围')
  })

  it('列数非法显示错误', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-columns'), { target: { value: '11' } })
    })
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('列数')
  })

  it('切换 JPEG 格式并下载', async () => {
    render(<Tool />)
    // PNG 下质量输入禁用
    expect((screen.getByTestId('opt-quality') as HTMLInputElement).disabled).toBe(true)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    })
    await waitFor(() =>
      expect(mockCanvasToBlob).toHaveBeenLastCalledWith(expect.anything(), 'image/jpeg', 0.9),
    )
    expect((screen.getByTestId('opt-quality') as HTMLInputElement).disabled).toBe(false)
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('sprite.jpg')
  })

  it('拖拽上传、空 drop 不处理、拖拽样式', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: null } })
    })
    expect(mockLoadImage).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile('a.png'), makeFile('b.png')] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('投放区为 label 且文件输入支持多选', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.multiple).toBe(true)
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })
})
