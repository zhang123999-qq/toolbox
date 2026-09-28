// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['png'], { type: 'image/png' })),
  createCanvas: vi.fn((w: number, h: number) => {
    const ctx = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }
    return { width: w, height: h, getContext: () => ctx }
  }),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  readFileAsDataURL: vi.fn(async () => 'data:image/svg+xml;base64,preview'),
}))

import { canvasToBlob, createCanvas, downloadBlob } from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
const mockDownloadBlob = vi.mocked(downloadBlob)

/**
 * jsdom 的 Image 不会真的 onload：用可手动触发 onload/onerror 的 mock 类代替。
 * width/height 模拟解码后的自然尺寸，可按用例调整。
 */
class MockImage {
  static failNext = false
  static naturalWidth = 200
  static naturalHeight = 100
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readonly width: number = MockImage.naturalWidth
  readonly height: number = MockImage.naturalHeight
  private _src = ''
  set src(v: string) {
    this._src = v
    setTimeout(() => {
      if (MockImage.failNext) this.onerror?.()
      else this.onload?.()
    }, 0)
  }
  get src(): string {
    return this._src
  }
}

type MockCtx = {
  fillRect: ReturnType<typeof vi.fn>
  drawImage: ReturnType<typeof vi.fn>
  fillStyle: string
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const SVG_200x100 =
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="red"/></svg>'
const SVG_NO_DIMS =
  '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10" fill="red"/></svg>'

function makeSvgFile(content = SVG_200x100, name = 'icon.svg') {
  return new File([content], name, { type: 'image/svg+xml' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** 取每次 createCanvas 调用的 [w, h] */
function canvasSizes(): Array<[number, number]> {
  return mockCreateCanvas.mock.calls.map(([w, h]) => [w, h] as [number, number])
}

function lastCtx(): MockCtx {
  const results = mockCreateCanvas.mock.results
  const canvas = results[results.length - 1].value as unknown as {
    getContext: () => MockCtx
  }
  return canvas.getContext()
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  MockImage.failNext = false
  MockImage.naturalWidth = 200
  MockImage.naturalHeight = 100
  vi.stubGlobal('Image', MockImage)
})

describe('svg-to-png 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('opt-width')).toBeTruthy()
    expect(screen.getByTestId('opt-height')).toBeTruthy()
    expect(screen.getByTestId('opt-background')).toBeTruthy()
    // 默认透明背景时不显示自定义颜色输入
    expect(screen.queryByTestId('opt-color')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('背景选自定义时显示颜色输入，切回后隐藏', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-background'), { target: { value: 'custom' } })
    expect(screen.getByTestId('opt-color')).toBeTruthy()
    fireEvent.change(screen.getByTestId('opt-background'), { target: { value: 'transparent' } })
    expect(screen.queryByTestId('opt-color')).toBeNull()
  })

  it('上传合法 SVG 后显示结果、预览与下载', async () => {
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('result-img')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
    // SVG 的 width/height 属性作为自然尺寸
    expect(canvasSizes()).toEqual([[200, 100]])
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 成功时也释放了 SVG 的 Blob URL
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('处理中显示提示', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    act(() => {
      fireEvent.change(input, { target: { files: [makeSvgFile()] } })
    })
    expect(screen.getByTestId('processing')).toBeTruthy()
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('上传非 SVG 文件显示错误', async () => {
    render(<Tool />)
    await upload(new File(['hello'], 'a.txt', { type: 'text/plain' }))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('空 SVG 文件显示错误', async () => {
    render(<Tool />)
    await upload(makeSvgFile(''))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('缺少 svg 标签显示错误', async () => {
    render(<Tool />)
    await upload(makeSvgFile('<html><body>not svg</body></html>'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('Image 加载失败显示错误并释放 URL', async () => {
    MockImage.failNext = true
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    // 失败时同样释放 Blob URL
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('白色背景填充画布', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-background'), { target: { value: 'white' } })
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const ctx = lastCtx()
    expect(ctx.fillStyle).toBe('#ffffff')
    expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(0)
    expect(ctx.drawImage.mock.calls.length).toBeGreaterThan(0)
  })

  it('透明背景不填充', async () => {
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(lastCtx().fillRect.mock.calls.length).toBe(0)
  })

  it('自定义颜色生效', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-background'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByTestId('opt-color'), { target: { value: '#ff0000' } })
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(lastCtx().fillStyle).toBe('#ff0000')
  })

  it('自定义颜色非法时报错', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-background'), { target: { value: 'custom' } })
    fireEvent.change(screen.getByTestId('opt-color'), { target: { value: '#zzz' } })
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('宽高都指定时直接使用', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '300' } })
    fireEvent.change(screen.getByTestId('opt-height'), { target: { value: '150' } })
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(canvasSizes()).toEqual([[300, 150]])
  })

  it('只给宽度时按比例缩放', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '100' } })
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 200x100 → 宽 100 → 高 50
    expect(canvasSizes()).toEqual([[100, 50]])
  })

  it('自然尺寸未知且未指定时默认 512', async () => {
    MockImage.naturalWidth = 0
    MockImage.naturalHeight = 0
    render(<Tool />)
    await upload(makeSvgFile(SVG_NO_DIMS))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(canvasSizes()).toEqual([[512, 512]])
  })

  it('自然尺寸未知时用解码尺寸兜底', async () => {
    render(<Tool />)
    await upload(makeSvgFile(SVG_NO_DIMS))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // SVG 无尺寸声明 → 用 Image 解码尺寸 200x100
    expect(canvasSizes()).toEqual([[200, 100]])
  })

  it('宽度非法时报错', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '0' } })
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('选项变更后重新处理', async () => {
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '120' } })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('无文件时选项变更不重新处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '120' } })
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob 且文件名为 .png', async () => {
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/icon\.png$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    // 重置后选项变更不再重新处理
    fireEvent.change(screen.getByTestId('opt-width'), { target: { value: '120' } })
    expect(mockCanvasToBlob.mock.calls.length).toBe(calls)
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makeSvgFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('拖拽空 dataTransfer 不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: null } })
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
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
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
  })

  it('画布上下文不可用时报错', async () => {
    mockCreateCanvas.mockReturnValueOnce({ getContext: () => null } as unknown as HTMLCanvasElement)
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('导出失败时显示错误', async () => {
    mockCanvasToBlob.mockRejectedValueOnce(new Error('导出失败'))
    render(<Tool />)
    await upload(makeSvgFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })
})
