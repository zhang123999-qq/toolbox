// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

const drawImageMock = vi.fn()
const getImageDataMock = vi.fn((_x: number, _y: number, _w: number, _h: number) => ({
  data: [10, 20, 30, 255],
}))
const ctxFake = { drawImage: drawImageMock, getImageData: getImageDataMock }

vi.mock('../../lib/image', () => ({
  createCanvas: vi.fn(),
  isSupportedImageFile: vi.fn(),
  loadImageFromBlob: vi.fn(),
}))

import { createCanvas, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'

const mockCreateCanvas = vi.mocked(createCanvas)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

/** 可编程的 EyeDropper mock：按用例切换 open 的行为 */
class MockEyeDropper {
  static openImpl: () => Promise<{ sRGBHex: string }> = async () => ({ sRGBHex: '#ff0000' })
  open(): Promise<{ sRGBHex: string }> {
    return MockEyeDropper.openImpl()
  }
}

const writeTextMock = vi.fn()

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

/** 把图片的 getBoundingClientRect 桩成固定值（jsdom 默认全 0） */
function stubRect(el: Element, rect: { width: number; height: number }) {
  el.getBoundingClientRect = () => ({
    x: 10,
    y: 20,
    width: rect.width,
    height: rect.height,
    top: 20,
    right: 10 + rect.width,
    bottom: 20 + rect.height,
    left: 10,
    toJSON: () => ({}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  window.EyeDropper = MockEyeDropper
  MockEyeDropper.openImpl = async () => ({ sRGBHex: '#ff0000' })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
  })
  writeTextMock.mockResolvedValue(undefined)
  mockCreateCanvas.mockImplementation(() => ({ getContext: () => ctxFake }) as never)
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 120, height: 80 }) as never)
})

describe('color-picker 组件', () => {
  it('EyeDropper 可用时渲染取色按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('eyedropper-btn')).toBeTruthy()
    expect(screen.queryByTestId('fallback-hint')).toBeNull()
  })

  it('EyeDropper 不可用时隐藏主按钮并提示用兜底路径', () => {
    delete window.EyeDropper
    render(<Tool />)
    expect(screen.queryByTestId('eyedropper-btn')).toBeNull()
    expect(screen.getByTestId('fallback-hint')).toBeTruthy()
  })

  it('EyeDropper 成功取色并归一化展示', async () => {
    MockEyeDropper.openImpl = async () => ({ sRGBHex: '#1A2B3C' })
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('eyedropper-btn'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('hex').textContent).toBe('#1a2b3c')
    expect(screen.getByTestId('rgb').textContent).toBe('rgb(26, 43, 60)')
    expect(screen.getByTestId('swatch').style.backgroundColor).toBe('rgb(26, 43, 60)')
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('EyeDropper 取色进行中禁用按钮', async () => {
    MockEyeDropper.openImpl = () => new Promise<{ sRGBHex: string }>(() => {})
    render(<Tool />)
    const btn = screen.getByTestId('eyedropper-btn') as HTMLButtonElement
    fireEvent.click(btn)
    await waitFor(() => expect(btn.disabled).toBe(true))
  })

  it('用户取消取色（AbortError）只轻提示不报错', async () => {
    MockEyeDropper.openImpl = () => Promise.reject(new DOMException('cancelled', 'AbortError'))
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('eyedropper-btn'))
    })
    await waitFor(() => expect(screen.getByTestId('notice')).toBeTruthy())
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('EyeDropper 其他错误显示通用错误', async () => {
    MockEyeDropper.openImpl = () => Promise.reject(new Error('denied'))
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('eyedropper-btn'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('EyeDropper 返回非法色值显示通用错误', async () => {
    MockEyeDropper.openImpl = async () => ({ sRGBHex: 'not-a-color' })
    render(<Tool />)
    await act(async () => {
      fireEvent.click(screen.getByTestId('eyedropper-btn'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('点击时 EyeDropper 突然不可用则报错', async () => {
    render(<Tool />)
    const btn = screen.getByTestId('eyedropper-btn')
    delete window.EyeDropper
    fireEvent.click(btn)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('上传图片后绘制 Canvas 并显示取色图', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(mockLoadImage).toHaveBeenCalled())
    expect(drawImageMock).toHaveBeenCalled()
    expect(screen.getByTestId('canvas-pick').className).not.toContain('hidden')
  })

  it('点击图片按坐标比例取像素颜色', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(mockLoadImage).toHaveBeenCalled())
    const img = screen.getByTestId('canvas-img')
    // 显示 60x40，自然 120x80；点 (40,30) → 自然 (60,20)
    stubRect(img, { width: 60, height: 40 })
    await act(async () => {
      fireEvent.click(img, { clientX: 40, clientY: 30 })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(getImageDataMock).toHaveBeenCalledWith(60, 20, 1, 1)
    expect(screen.getByTestId('hex').textContent).toBe('#0a141e')
    expect(screen.getByTestId('rgb').textContent).toBe('rgb(10, 20, 30)')
    expect(screen.getByTestId('hsl').textContent).toBe('hsl(210, 50%, 8%)')
  })

  it('图片未布局完成（宽为 0）时点击被忽略', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(mockLoadImage).toHaveBeenCalled())
    const img = screen.getByTestId('canvas-img')
    // jsdom 默认 rect 全 0，触发除数为 0 守卫
    fireEvent.click(img, { clientX: 10, clientY: 10 })
    expect(getImageDataMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片高为 0 时点击被忽略', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(mockLoadImage).toHaveBeenCalled())
    const img = screen.getByTestId('canvas-img')
    stubRect(img, { width: 60, height: 0 })
    fireEvent.click(img, { clientX: 40, clientY: 30 })
    expect(getImageDataMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('无坐标的点击（如键盘激活按钮）被忽略', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(mockLoadImage).toHaveBeenCalled())
    // 不传 clientX/clientY → 均为 0，无法定位像素
    fireEvent.click(screen.getByTestId('canvas-pick'))
    expect(getImageDataMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('未上传图片时点击取色图不做任何事', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('canvas-img'))
    expect(getImageDataMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('Canvas 上下文获取失败显示错误', async () => {
    mockCreateCanvas.mockImplementationOnce(() => ({ getContext: () => null }) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: null } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('拖拽上传图片', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile()] } })
    })
    await waitFor(() => expect(mockLoadImage).toHaveBeenCalled())
  })

  it('手动输入合法色值得到结果', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('manual-hex'), { target: { value: '#0A141E' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('manual-form'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('hex').textContent).toBe('#0a141e')
  })

  it('手动输入空值报错', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.submit(screen.getByTestId('manual-form'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('请输入颜色值')
  })

  it('手动输入非法值报错', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('manual-hex'), { target: { value: 'xyz' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('manual-form'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('颜色值无效')
  })

  it('点击复制按钮写入剪贴板并提示', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('manual-hex'), { target: { value: '#ff0000' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('manual-form'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-hex'))
    })
    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith('#ff0000'))
    expect(screen.getByTestId('notice')).toBeTruthy()
  })

  it('点击 HEX 值按钮复制 hex 文本', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('manual-hex'), { target: { value: '#ff0000' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('manual-form'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('hex'))
    expect(writeTextMock).toHaveBeenCalledWith('#ff0000')
  })

  it('点击 RGB / HSL 值复制对应文本', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('manual-hex'), { target: { value: '#0a141e' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('manual-form'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('rgb'))
    expect(writeTextMock).toHaveBeenCalledWith('rgb(10, 20, 30)')
    fireEvent.click(screen.getByTestId('hsl'))
    expect(writeTextMock).toHaveBeenCalledWith('hsl(210, 50%, 8%)')
  })

  it('复制失败显示错误提示', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('denied'))
    render(<Tool />)
    fireEvent.change(screen.getByTestId('manual-hex'), { target: { value: '#ff0000' } })
    await act(async () => {
      fireEvent.submit(screen.getByTestId('manual-form'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('copy-hex'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })
})
