// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

/** 1x1 透明 PNG（真实图片字节） */
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const DATA_URL = `data:image/png;base64,${PNG_1X1_B64}`

function makeCtx() {
  return { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
}

let activeCtx = makeCtx()
let nullCtx = false

vi.mock('../../lib/image', () => ({
  createCanvas: vi.fn((w: number, h: number) => ({
    width: w,
    height: h,
    getContext: () => (nullCtx ? null : activeCtx),
  })),
  canvasToBlob: vi.fn(async () => new Blob(['out'], { type: 'image/png' })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  loadImageFromBlob: vi.fn(async () => ({ width: 8, height: 4 })),
}))

import { canvasToBlob, createCanvas, downloadBlob, loadImageFromBlob } from '../../lib/image'

const mockCreateCanvas = vi.mocked(createCanvas)
const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockLoadImage = vi.mocked(loadImageFromBlob)

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  activeCtx = makeCtx()
  nullCtx = false
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockLoadImage.mockImplementation(async () => ({ width: 8, height: 4 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['out'], { type: 'image/png' }))
  Object.defineProperty(navigator, 'clipboard', {
    value: { readText: vi.fn() },
    configurable: true,
  })
})

function setInput(value: string) {
  fireEvent.change(screen.getByTestId('base64-input'), { target: { value } })
}

function inputValue(): string {
  return (screen.getByTestId('base64-input') as HTMLTextAreaElement).value
}

async function clickDecode() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('decode'))
  })
}

describe('base64-to-image 组件', () => {
  it('渲染输入区、按钮与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('base64-input')).toBeTruthy()
    expect(screen.getByTestId('paste')).toBeTruthy()
    expect(screen.getByTestId('decode')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.queryByTestId('download')).toBeNull()
  })

  it('DataURL 输入解码成功：预览、尺寸体积、下载', async () => {
    render(<Tool />)
    setInput(DATA_URL)
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('preview').getAttribute('src')).toBe('blob:mock-url')
    expect(screen.getByTestId('stats').textContent).toContain('8 × 4')
    expect(screen.getByTestId('stats').textContent).toContain('B')
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockLoadImage.mock.calls[0][0]).toBeInstanceOf(Blob)
  })

  it('纯 base64 输入解码成功（无声明 MIME 时按魔数推断）', async () => {
    render(<Tool />)
    setInput(PNG_1X1_B64)
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mockCreateCanvas).toHaveBeenCalled()
    expect(mockCanvasToBlob).toHaveBeenCalled()
  })

  it('空输入报错', async () => {
    render(<Tool />)
    setInput('   ')
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('输入不能为空'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('非法 base64 报错', async () => {
    render(<Tool />)
    setInput('aGVsbG8')
    await clickDecode()
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('不是合法的 Base64'),
    )
  })

  it('DataURL 非图片 MIME 报错', async () => {
    render(<Tool />)
    setInput('data:text/plain;base64,aGVsbG8=')
    await clickDecode()
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('不支持的 DataURL 类型'),
    )
  })

  it('解码内容非图片时报错（loadImageFromBlob 失败）', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('图片解码失败：文件可能已损坏'))
    render(<Tool />)
    // "hello world" 的 base64：合法但非图片字节
    setInput('aGVsbG8gd29ybGQ=')
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('图片解码失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('Canvas 上下文不可用时报错', async () => {
    nullCtx = true
    render(<Tool />)
    setInput(DATA_URL)
    await clickDecode()
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用'),
    )
  })

  it('JPEG 输出先铺白底（透明不导出变黑）', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    setInput(DATA_URL)
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(activeCtx.fillStyle).toBe('#ffffff')
    expect(activeCtx.fillRect).toHaveBeenCalledWith(0, 0, 8, 4)
    expect(activeCtx.drawImage).toHaveBeenCalled()
    expect(mockCanvasToBlob.mock.calls[0][1]).toBe('image/jpeg')
    expect(mockCanvasToBlob.mock.calls[0][2]).toBe(0.8)
  })

  it('PNG 输出不铺白底', async () => {
    render(<Tool />)
    setInput(DATA_URL)
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(activeCtx.fillRect).not.toHaveBeenCalled()
    expect(mockCanvasToBlob.mock.calls[0][1]).toBe('image/png')
    expect(mockCanvasToBlob.mock.calls[0][2]).toBeUndefined()
  })

  it('解码中显示处理提示', async () => {
    let release!: (img: unknown) => void
    mockLoadImage.mockImplementationOnce(
      () =>
        new Promise((res) => {
          release = res
        }) as never,
    )
    render(<Tool />)
    setInput(PNG_1X1_B64)
    act(() => {
      fireEvent.click(screen.getByTestId('decode'))
    })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      release({ width: 8, height: 4 })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('质量非法时报错', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '101' } })
    })
    setInput(DATA_URL)
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('超出范围'))
  })

  it('下载按钮调用 downloadBlob 并按格式命名', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    setInput(DATA_URL)
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('base64-image.jpg')
  })

  it('重置清空输入与结果', async () => {
    render(<Tool />)
    setInput(DATA_URL)
    await clickDecode()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(inputValue()).toBe('')
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('粘贴按钮：剪贴板读取成功写入输入框', async () => {
    const readText = navigator.clipboard.readText as ReturnType<typeof vi.fn>
    readText.mockResolvedValueOnce(DATA_URL)
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('paste'))
    })
    await waitFor(() => expect(inputValue()).toBe(DATA_URL))
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('粘贴按钮：剪贴板读取失败时不写入（降级提示待文案合并后显示）', async () => {
    const readText = navigator.clipboard.readText as ReturnType<typeof vi.fn>
    readText.mockRejectedValueOnce(new Error('denied'))
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('paste'))
    })
    // catch 分支已执行：剪贴板被读取但输入框保持不变、未产生结果
    await waitFor(() => expect(readText).toHaveBeenCalled())
    expect(inputValue()).toBe('')
    expect(screen.queryByTestId('result')).toBeNull()
  })
})
