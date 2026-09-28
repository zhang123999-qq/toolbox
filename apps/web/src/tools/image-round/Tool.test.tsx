// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(),
  createCanvas: vi.fn(),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn(),
  loadImageFromBlob: vi.fn(),
  readFileAsDataURL: vi.fn(),
}))

import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockCreateCanvas = vi.mocked(createCanvas)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)
const mockReadDataURL = vi.mocked(readFileAsDataURL)

afterEach(() => {
  cleanup()
})

/** 可断言的 2D 上下文 mock：记录 fillStyle 与全部调用 */
function makeCtx() {
  return {
    fillStyle: '',
    save: vi.fn(),
    restore: vi.fn(),
    clip: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
  }
}

type MockCtx = ReturnType<typeof makeCtx>
let lastCtx: MockCtx = makeCtx()

function makeCanvas(ctx: MockCtx | null) {
  return { width: 0, height: 0, getContext: () => ctx }
}

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

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation((async () => ({ width: 800, height: 600 })) as never)
  mockCreateCanvas.mockImplementation(((w: number, h: number) => {
    lastCtx = makeCtx()
    const canvas = makeCanvas(lastCtx)
    canvas.width = w
    canvas.height = h
    return canvas
  }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['rounded'], { type: 'image/png' }))
  mockReadDataURL.mockImplementation(async () => 'data:image/png;base64,preview')
})

describe('image-round 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-mode')).toBeTruthy()
    expect(screen.getByTestId('opt-radius')).toBeTruthy()
    expect(screen.getByTestId('opt-radius-unit')).toBeTruthy()
    expect(screen.getByTestId('opt-background')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    // 默认背景为透明时不显示自定义颜色选择器
    expect(screen.queryByTestId('opt-custom-color')).toBeNull()
  })

  it('上传合法图片后显示结果与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('preview-original')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(mockLoadImage).toHaveBeenCalled()
    expect(mockCreateCanvas).toHaveBeenCalledWith(800, 600)
    expect(mockCanvasToBlob).toHaveBeenCalled()
    // 圆角路径：arcTo 被调用；透明+PNG：不填充背景
    expect(lastCtx.arcTo).toHaveBeenCalled()
    expect(lastCtx.clip).toHaveBeenCalled()
    expect(lastCtx.drawImage).toHaveBeenCalled()
    expect(lastCtx.fillRect).not.toHaveBeenCalled()
  })

  it('圆形模式：输出正方形、半径输入禁用', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-mode'), { target: { value: 'circle' } })
    expect((screen.getByTestId('opt-radius') as HTMLInputElement).disabled).toBe(true)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 800x600 → 内切圆直径 600，输出 600x600
    expect(mockCreateCanvas).toHaveBeenCalledWith(600, 600)
    expect(lastCtx.arc).toHaveBeenCalled()
    expect(lastCtx.clip).toHaveBeenCalled()
  })

  it('半径单位切换触发重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-radius-unit'), { target: { value: '%' } })
    })
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBeGreaterThan(calls))
  })

  it('自定义背景色：显示颜色选择器并用于填充', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-background'), { target: { value: 'custom' } })
    const colorInput = screen.getByTestId('opt-custom-color') as HTMLInputElement
    fireEvent.change(colorInput, { target: { value: '#ff0000' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(lastCtx.fillRect).toHaveBeenCalled()
    expect(lastCtx.fillStyle).toBe('#ff0000')
  })

  it('透明背景 + JPEG：自动按白色填充并显示提示', async () => {
    render(<Tool />)
    // 默认透明 + PNG：无提示
    expect(screen.queryByTestId('jpeg-hint')).toBeNull()
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    expect(screen.getByTestId('jpeg-hint')).toBeTruthy()
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(lastCtx.fillRect).toHaveBeenCalled()
    expect(lastCtx.fillStyle).toBe('#ffffff')
    // 切到白色背景后提示消失
    fireEvent.change(screen.getByTestId('opt-background'), { target: { value: 'white' } })
    expect(screen.queryByTestId('jpeg-hint')).toBeNull()
  })

  it('半径非法时显示错误', async () => {
    render(<Tool />)
    // number 输入框无法填入非数字，用超范围数字触发错误
    fireEvent.change(screen.getByTestId('opt-radius'), { target: { value: '99999' } })
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('半径过大')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('Canvas 上下文不可用时显示错误', async () => {
    mockCreateCanvas.mockImplementationOnce((() => makeCanvas(null)) as never)
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('处理中显示提示', async () => {
    let resolveImg: ((img: { width: number; height: number }) => void) | undefined
    mockLoadImage.mockImplementationOnce(
      () =>
        new Promise<{ width: number; height: number }>((res) => {
          resolveImg = res
        }) as never,
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile()] } })
    expect(await screen.findByTestId('processing')).toBeTruthy()
    await act(async () => {
      resolveImg?.({ width: 800, height: 600 })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('无文件时选项变更不触发处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'jpeg' } })
    expect(mockCanvasToBlob).not.toHaveBeenCalled()
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toMatch(/photo-rounded\.png$/)
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('preview-original')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
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
