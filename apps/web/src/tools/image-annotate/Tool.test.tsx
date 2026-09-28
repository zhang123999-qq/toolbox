// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

// 禁止 mock ../../i18n：缺 key 时 t() 返回 undefined，断言只依赖 testid 存在性
// 或 utils/字面量抛出的中文错误文本，不依赖翻译文案。
vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['annotated'], { type: 'image/png' })),
  downloadBlob: vi.fn(),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 100, height: 80 })),
}))

import {
  canvasToBlob,
  downloadBlob,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

/** 每测试重建的 2D 上下文 mock：属性赋值即生效，方法全为 vi.fn() */
function makeMockCtx() {
  return {
    drawImage: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    ellipse: vi.fn(),
    getImageData: vi.fn(
      () =>
        ({
          data: new Uint8ClampedArray(100 * 80 * 4),
          width: 100,
          height: 80,
        }) as ImageData,
    ),
    putImageData: vi.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: '',
    lineJoin: '',
    font: '',
  }
}

let mockCtx: ReturnType<typeof makeMockCtx>

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

/** 上传并等待画布出现，返回标注层 canvas */
async function uploadAndGetCanvas() {
  await upload(makeFile())
  await waitFor(() => expect(screen.getByTestId('draw-canvas')).toBeTruthy())
  return screen.getByTestId('draw-canvas')
}

function selectTool(id: string) {
  fireEvent.click(screen.getByTestId(`tool-${id}`))
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCtx = makeMockCtx()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    mockCtx as unknown as CanvasRenderingContext2D,
  )
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 100, height: 80 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['a'], { type: 'image/png' }))
})

describe('image-annotate 组件', () => {
  it('渲染投放区；未上传时无画布与工具栏', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.queryByTestId('draw-canvas')).toBeNull()
    expect(screen.queryByTestId('tool-brush')).toBeNull()
  })

  it('上传合法图片后显示双层画布与工具栏', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('draw-canvas')).toBeTruthy())
    expect(screen.getByTestId('base-canvas')).toBeTruthy()
    const canvas = screen.getByTestId('draw-canvas') as HTMLCanvasElement
    // 原尺寸 1:1（mock 图片 100×80）
    expect(canvas.width).toBe(100)
    expect(canvas.height).toBe(80)
    expect(screen.getByTestId('canvas-size').textContent).toContain('100×80')
    for (const id of ['brush', 'line', 'arrow', 'rect', 'ellipse', 'text', 'mosaic']) {
      expect(screen.getByTestId(`tool-${id}`)).toBeTruthy()
    }
    expect(mockLoadImage).toHaveBeenCalled()
    // 底图已绘制
    expect(mockCtx.drawImage).toHaveBeenCalled()
  })

  it('上传时显示处理中', async () => {
    let resolveLoad: (img: HTMLImageElement) => void = () => undefined
    mockLoadImage.mockImplementationOnce(
      () =>
        new Promise<HTMLImageElement>((resolve) => {
          resolveLoad = resolve
        }),
    )
    render(<Tool />)
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [makeFile()] } })
    expect(screen.getByTestId('processing')).toBeTruthy()
    await act(async () => {
      resolveLoad({ width: 100, height: 80 } as HTMLImageElement)
    })
    await waitFor(() => expect(screen.getByTestId('draw-canvas')).toBeTruthy())
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('draw-canvas')).toBeNull()
  })

  it('文件过大显示错误', async () => {
    const file = makeFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
  })

  it('图片加载失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('拖拽空文件不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: null } })
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('draw-canvas')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile()] } })
    })
    await waitFor(() => expect(screen.getByTestId('draw-canvas')).toBeTruthy())
  })

  it('切换全部标注工具（激活态切换）', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    expect(canvas).toBeTruthy()
    const ids = ['brush', 'line', 'arrow', 'rect', 'ellipse', 'text', 'mosaic']
    for (const id of ids) {
      selectTool(id)
      expect(screen.getByTestId(`tool-${id}`).className).toContain('bg-blue-600')
    }
    // 切到 mosaic 后 brush 应回到非激活态
    expect(screen.getByTestId('tool-brush').className).not.toContain('bg-blue-600')
  })

  it('画笔绘制落笔成线并可撤销', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    const undo = screen.getByTestId('undo') as HTMLButtonElement
    expect(undo.disabled).toBe(true)
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 })
    fireEvent.mouseUp(canvas)
    expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 10)
    expect(mockCtx.lineTo).toHaveBeenCalledWith(20, 20)
    expect(mockCtx.stroke).toHaveBeenCalled()
    expect(undo.disabled).toBe(false)
    fireEvent.click(undo)
    expect(mockCtx.putImageData).toHaveBeenCalled()
    expect((screen.getByTestId('undo') as HTMLButtonElement).disabled).toBe(true)
  })

  it('颜色选项变更影响后续绘制', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    fireEvent.change(screen.getByTestId('opt-color'), { target: { value: '#00ff00' } })
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    expect(mockCtx.strokeStyle).toBe('#00ff00')
    expect(mockCtx.fillStyle).toBe('#00ff00')
    fireEvent.mouseUp(canvas)
  })

  it('未落笔时移动/抬起不绘制不入历史', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    fireEvent.mouseMove(canvas, { clientX: 20, clientY: 20 })
    fireEvent.mouseUp(canvas)
    expect(mockCtx.lineTo).not.toHaveBeenCalled()
    expect(mockCtx.getImageData).not.toHaveBeenCalled()
    expect((screen.getByTestId('undo') as HTMLButtonElement).disabled).toBe(true)
  })

  it('直线 rubber-band 预览（恢复快照再画）', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('line')
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 20 })
    // 先恢复落笔快照
    expect(mockCtx.putImageData).toHaveBeenCalled()
    expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 10)
    expect(mockCtx.lineTo).toHaveBeenCalledWith(30, 20)
    expect(mockCtx.stroke).toHaveBeenCalled()
    fireEvent.mouseUp(canvas)
    expect((screen.getByTestId('undo') as HTMLButtonElement).disabled).toBe(false)
  })

  it('箭头绘制主干与两翼', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('arrow')
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 50, clientY: 10 })
    // 主干 lineTo + 两翼 2 次 lineTo
    expect(mockCtx.lineTo).toHaveBeenCalledWith(50, 10)
    expect(mockCtx.lineTo.mock.calls.length).toBeGreaterThanOrEqual(3)
    fireEvent.mouseUp(canvas)
  })

  it('箭头零长度不画两翼也不抛错', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('arrow')
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 10, clientY: 10 })
    // 只有主干的一次 lineTo
    expect(mockCtx.lineTo).toHaveBeenCalledTimes(1)
    expect(mockCtx.lineTo).toHaveBeenCalledWith(10, 10)
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('矩形绘制', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('rect')
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 25 })
    expect(mockCtx.strokeRect).toHaveBeenCalledWith(10, 10, 20, 15)
    fireEvent.mouseUp(canvas)
  })

  it('椭圆绘制', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('ellipse')
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseMove(canvas, { clientX: 30, clientY: 20 })
    expect(mockCtx.ellipse).toHaveBeenCalledWith(20, 15, 10, 5, 0, 0, Math.PI * 2)
    expect(mockCtx.stroke).toHaveBeenCalled()
    fireEvent.mouseUp(canvas)
  })

  it('文字为空时点击提示错误', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('text')
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 20 })
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(mockCtx.fillText).not.toHaveBeenCalled()
  })

  it('文字非空时点击放置并入历史', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('text')
    fireEvent.change(screen.getByTestId('opt-text'), { target: { value: '你好' } })
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 20 })
    expect(mockCtx.fillText).toHaveBeenCalledWith('你好', 10, 20)
    expect(mockCtx.font).toContain('32px')
    expect((screen.getByTestId('undo') as HTMLButtonElement).disabled).toBe(false)
  })

  it('马赛克笔刷像素化底图区域', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('mosaic')
    // 线宽 4 → 半径 16，区域 (34,24,32,32)
    fireEvent.mouseDown(canvas, { clientX: 50, clientY: 40 })
    expect(mockCtx.getImageData).toHaveBeenCalledWith(34, 24, 32, 32)
    expect(mockCtx.putImageData).toHaveBeenCalled()
    fireEvent.mouseMove(canvas, { clientX: 60, clientY: 40 })
    expect(mockCtx.getImageData).toHaveBeenCalledWith(44, 24, 32, 32)
    fireEvent.mouseUp(canvas)
    expect((screen.getByTestId('undo') as HTMLButtonElement).disabled).toBe(false)
  })

  it('线宽非法时落笔提示错误', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    fireEvent.change(screen.getByTestId('opt-linewidth'), { target: { value: '999' } })
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    expect(screen.getByTestId('error').textContent).toContain('线宽超出范围')
  })

  it('字号非法时文字放置提示错误', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    selectTool('text')
    fireEvent.change(screen.getByTestId('opt-fontsize'), { target: { value: '999' } })
    fireEvent.change(screen.getByTestId('opt-text'), { target: { value: 'hi' } })
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    expect(screen.getByTestId('error').textContent).toContain('字号超出范围')
  })

  it('Canvas 上下文不可用时显示错误', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValueOnce(null)
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    expect(screen.getByTestId('error').textContent).toContain('Canvas 2D 上下文不可用')
  })

  it('清空标注并清空历史', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseUp(canvas)
    expect((screen.getByTestId('undo') as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(screen.getByTestId('clear'))
    expect(mockCtx.clearRect).toHaveBeenCalled()
    expect((screen.getByTestId('undo') as HTMLButtonElement).disabled).toBe(true)
  })

  it('下载合并底图与标注层并调用 downloadBlob', async () => {
    render(<Tool />)
    await uploadAndGetCanvas()
    fireEvent.click(screen.getByTestId('download'))
    await waitFor(() => expect(mockDownloadBlob).toHaveBeenCalled())
    const [, name] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(name).toBe('photo-annotated.png')
    // 底图绘制 1 次 + 下载合并 2 次
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(3)
  })

  it('下载失败显示错误', async () => {
    mockCanvasToBlob.mockRejectedValueOnce(new Error('导出失败'))
    render(<Tool />)
    await uploadAndGetCanvas()
    fireEvent.click(screen.getByTestId('download'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('导出失败'))
  })

  it('重置清空画布与状态', async () => {
    render(<Tool />)
    const canvas = await uploadAndGetCanvas()
    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 })
    fireEvent.mouseUp(canvas)
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('draw-canvas')).toBeNull()
    expect(screen.queryByTestId('tool-brush')).toBeNull()
    expect(screen.getByTestId('dropzone').textContent).not.toContain('photo.png')
  })
})
