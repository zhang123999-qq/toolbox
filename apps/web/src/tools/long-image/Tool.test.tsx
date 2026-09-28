// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['stitched'], { type: 'image/jpeg' })),
  createCanvas: vi.fn((w: number, h: number) => ({
    width: w,
    height: h,
    getContext: () => ({ fillStyle: '', fillRect: () => {}, drawImage: () => {} }),
  })),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn((_img: unknown, _sw: number, _sh: number, dw: number, dh: number) => ({
    width: dw,
    height: dh,
  })),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
}))

import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
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

function makeBigFile(name = 'big.png') {
  const file = makeFile(name)
  Object.defineProperty(file, 'size', { value: 60 * 1024 * 1024 })
  return file
}

async function uploadFiles(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

async function uploadTwo() {
  await uploadFiles([makeFile('a.png'), makeFile('b.png')])
  await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(
    (_img: unknown, _sw: number, _sh: number, dw: number, dh: number) =>
      ({ width: dw, height: dh }) as never,
  )
  mockCreateCanvas.mockImplementation(
    (w: number, h: number) =>
      ({
        width: w,
        height: h,
        getContext: () => ({ fillStyle: '', fillRect: () => {}, drawImage: () => {} }),
      }) as never,
  )
  mockCanvasToBlob.mockImplementation(async () => new Blob(['s'], { type: 'image/jpeg' }))
})

describe('long-image 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('opt-widthMode')).toBeTruthy()
    expect(screen.getByTestId('opt-align')).toBeTruthy()
    expect(screen.getByTestId('opt-gap')).toBeTruthy()
    expect(screen.getByTestId('opt-bgColor')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    // 文件输入支持多选
    expect((screen.getByTestId('file-input') as HTMLInputElement).multiple).toBe(true)
    // uniform 模式下对齐选项不可用
    expect((screen.getByTestId('opt-align') as HTMLSelectElement).disabled).toBe(true)
  })

  it('上传 2 张图片后自动拼接并显示总尺寸', async () => {
    render(<Tool />)
    await uploadTwo()
    expect(screen.getByTestId('stats').textContent).toContain('800×1200')
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockDrawScaled).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('只上传 1 张时不拼接', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png')])
    await waitFor(() => expect(screen.getByTestId('count')).toBeTruthy())
    expect(screen.getByTestId('count').textContent).toContain('1')
    expect(screen.queryByTestId('result')).toBeNull()
    // 无结果时清空：覆盖 setResult updater 的 prev 为空分支
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('items')).toBeNull()
  })

  it('拼接过程中显示 processing', async () => {
    let release!: (b: Blob) => void
    mockCanvasToBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((resolve) => {
          release = resolve
        }),
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    act(() => {
      fireEvent.change(input, { target: { files: [makeFile('a.png'), makeFile('b.png')] } })
    })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      release(new Blob(['x'], { type: 'image/jpeg' }))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.txt', 'text/plain')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    // 文件名会拼在错误信息前（i18n key 合并前 t() 返回空，仅断言文件名部分）
    expect(screen.getByTestId('error').textContent).toContain('a.txt')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超大文件被拒绝（原始中文错误）', async () => {
    render(<Tool />)
    await uploadFiles([makeBigFile()])
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('单张失败不污染其他图片', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('图片解码失败：bad.png'))
    render(<Tool />)
    await uploadFiles([makeFile('bad.png'), makeFile('good.png')])
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('图片解码失败'))
    // 成功的那张仍被加入
    expect(screen.getByTestId('count').textContent).toContain('1')
    expect(screen.getByTestId('item-0').textContent).toContain('good.png')
  })

  it('图片解码失败时拼接报错', async () => {
    render(<Tool />)
    await uploadTwo()
    // 重新拼接阶段解码失败（第二次拼接时 loadImage 抛错）
    mockLoadImage.mockRejectedValueOnce(new Error('图片解码失败'))
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('图片解码失败'))
  })

  it('Canvas 上下文不可用时中断拼接', async () => {
    mockCreateCanvas.mockImplementationOnce(
      () => ({ width: 10, height: 10, getContext: () => null }) as never,
    )
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png')])
    // 上传完成且拼接已触发（getContext 返回 null 时 stitch 同步抛错）
    await waitFor(() => expect(screen.getByTestId('items')).toBeTruthy())
    await waitFor(() => expect(mockCreateCanvas).toHaveBeenCalled())
    // 未走到导出，无结果
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上移/下移调整图片顺序', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('item-0').textContent).toContain('a.png')
    fireEvent.click(screen.getByTestId('move-down-0'))
    await waitFor(() => expect(screen.getByTestId('item-0').textContent).toContain('b.png'))
    expect(screen.getByTestId('item-1').textContent).toContain('a.png')
    fireEvent.click(screen.getByTestId('move-up-1'))
    await waitFor(() => expect(screen.getByTestId('item-0').textContent).toContain('a.png'))
    expect(screen.getByTestId('item-1').textContent).toContain('b.png')
  })

  it('首尾项的移动按钮被禁用', async () => {
    render(<Tool />)
    await uploadTwo()
    expect((screen.getByTestId('move-up-0') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTestId('move-down-0') as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByTestId('move-up-1') as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByTestId('move-down-1') as HTMLButtonElement).disabled).toBe(true)
  })

  it('删除单张图片并释放 object URL', async () => {
    render(<Tool />)
    await uploadFiles([makeFile('a.png'), makeFile('b.png'), makeFile('c.png')])
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('remove-0'))
    await waitFor(() => expect(screen.getByTestId('items').children.length).toBe(2))
    expect(screen.getByTestId('item-0').textContent).toContain('b.png')
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('图片不足 2 张时清空结果并释放 URL', async () => {
    render(<Tool />)
    await uploadTwo()
    fireEvent.click(screen.getByTestId('remove-0'))
    await waitFor(() => expect(screen.queryByTestId('result')).toBeNull())
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('清空移除所有图片与结果', async () => {
    render(<Tool />)
    await uploadTwo()
    fireEvent.click(screen.getByTestId('clear'))
    expect(screen.queryByTestId('items')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('count')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    // input 被重挂载，可继续上传
    expect(screen.getByTestId('file-input')).toBeTruthy()
  })

  it('切换宽度模式触发重拼并启用对齐', async () => {
    render(<Tool />)
    await uploadTwo()
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-widthMode'), { target: { value: 'original' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
    expect((screen.getByTestId('opt-align') as HTMLSelectElement).disabled).toBe(false)
  })

  it('修改对齐/背景色/格式/质量触发重拼', async () => {
    render(<Tool />)
    await uploadTwo()
    fireEvent.change(screen.getByTestId('opt-widthMode'), { target: { value: 'original' } })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-align'), { target: { value: 'right' } })
    fireEvent.change(screen.getByTestId('opt-bgColor'), { target: { value: '#ff0000' } })
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '90' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('间距非法时显示错误（原始中文）', async () => {
    render(<Tool />)
    await uploadTwo()
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-gap'), { target: { value: '999' } })
    })
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('间距超出范围'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('质量非法时显示错误（原始中文）', async () => {
    render(<Tool />)
    await uploadTwo()
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('质量超出范围'))
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await uploadTwo()
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(name).toMatch(/^long-image-\d{8}-\d{6}\.jpg$/)
  })

  it('重复拼接时释放旧结果 URL', async () => {
    render(<Tool />)
    await uploadTwo()
    const firstCalls = (URL.revokeObjectURL as ReturnType<typeof vi.fn>).mock.calls.length
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'webp' } })
    await waitFor(() =>
      expect((URL.revokeObjectURL as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
        firstCalls,
      ),
    )
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone)
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile('a.png'), makeFile('b.png')] } })
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

  it('drop 空文件列表不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: null } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })
})
