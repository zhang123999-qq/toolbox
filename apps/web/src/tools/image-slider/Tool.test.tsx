// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  isSupportedImageFile: vi.fn(),
  loadImageFromBlob: vi.fn(),
}))

import { isSupportedImageFile, loadImageFromBlob } from '../../lib/image'
import { MAX_FILE_SIZE } from './utils'

const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

afterEach(() => {
  cleanup()
})

let urlCounter = 0
let rectSpy: ReturnType<typeof vi.spyOn>

const RECT_800 = {
  width: 800,
  height: 600,
  left: 0,
  top: 0,
  right: 800,
  bottom: 600,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as unknown as DOMRect

function mockZeroRect() {
  rectSpy.mockReturnValue({
    width: 0,
    height: 0,
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as unknown as DOMRect)
}

beforeEach(() => {
  vi.restoreAllMocks()
  urlCounter = 0
  URL.createObjectURL = vi.fn(() => `blob:mock-${urlCounter++}`)
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(RECT_800)
})

function makeFile(name = 'a.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function uploadTo(testId: 'file-before' | 'file-after', file: File) {
  const input = screen.getByTestId(testId) as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function uploadBoth() {
  await uploadTo('file-before', makeFile('before.png'))
  await uploadTo('file-after', makeFile('after.png'))
  await waitFor(() => expect(screen.getByTestId('compare-area')).toBeTruthy())
}

function ariaValueNow() {
  return screen.getByTestId('slider-handle').getAttribute('aria-valuenow')
}

describe('image-slider 组件', () => {
  it('渲染两个投放区与方向选项，无图时不显示对比区', () => {
    render(<Tool />)
    expect(screen.getByTestId('drop-before')).toBeTruthy()
    expect(screen.getByTestId('drop-after')).toBeTruthy()
    expect(screen.getByTestId('opt-direction')).toBeTruthy()
    expect(screen.queryByTestId('compare-area')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('只上传一张图不显示对比区', async () => {
    render(<Tool />)
    await uploadTo('file-before', makeFile('before.png'))
    await waitFor(() =>
      expect(screen.getByTestId('drop-before').textContent).toContain('before.png'),
    )
    expect(screen.queryByTestId('compare-area')).toBeNull()
  })

  it('两张图就绪显示对比区，滑块初始 50', async () => {
    render(<Tool />)
    await uploadBoth()
    const before = screen.getByTestId('img-before') as HTMLImageElement
    const after = screen.getByTestId('img-after') as HTMLImageElement
    expect(before.src).toContain('blob:mock-0')
    expect(after.src).toContain('blob:mock-1')
    expect(ariaValueNow()).toBe('50')
    expect(before.style.clipPath).toBe('inset(0 50% 0 0)')
  })

  it('拖拽分隔线改变百分比，mouseup 后停止响应', async () => {
    render(<Tool />)
    await uploadBoth()
    const handle = screen.getByTestId('slider-handle')
    fireEvent.mouseDown(handle, { clientX: 200, clientY: 300 })
    // 拖拽中 cursor 切换
    expect(screen.getByTestId('compare-track').className).toContain('cursor-grabbing')
    fireEvent.mouseMove(document, { clientX: 200, clientY: 300 })
    expect(ariaValueNow()).toBe('25')
    expect(handle.style.left).toBe('25%')
    expect((screen.getByTestId('img-before') as HTMLElement).style.clipPath).toBe(
      'inset(0 75% 0 0)',
    )
    fireEvent.mouseUp(document)
    fireEvent.mouseMove(document, { clientX: 700, clientY: 300 })
    expect(ariaValueNow()).toBe('25')
  })

  it('未拖拽时 document mousemove 不改变百分比', async () => {
    render(<Tool />)
    await uploadBoth()
    fireEvent.mouseMove(document, { clientX: 700, clientY: 300 })
    expect(ariaValueNow()).toBe('50')
  })

  it('点击轨道任意位置直接跳转', async () => {
    render(<Tool />)
    await uploadBoth()
    fireEvent.mouseDown(screen.getByTestId('compare-track'), { clientX: 600, clientY: 300 })
    expect(ariaValueNow()).toBe('75')
  })

  it('键盘方向键微调 ±2，其他键忽略', async () => {
    render(<Tool />)
    await uploadBoth()
    const handle = screen.getByTestId('slider-handle')
    fireEvent.keyDown(handle, { key: 'ArrowRight' })
    expect(ariaValueNow()).toBe('52')
    fireEvent.keyDown(handle, { key: 'ArrowLeft' })
    expect(ariaValueNow()).toBe('50')
    fireEvent.keyDown(handle, { key: 'ArrowUp' })
    expect(ariaValueNow()).toBe('48')
    fireEvent.keyDown(handle, { key: 'ArrowDown' })
    expect(ariaValueNow()).toBe('50')
    fireEvent.keyDown(handle, { key: 'Enter' })
    expect(ariaValueNow()).toBe('50')
  })

  it('容器宽为 0 时拖拽不报错、不更新', async () => {
    mockZeroRect()
    render(<Tool />)
    await uploadBoth()
    fireEvent.mouseDown(screen.getByTestId('slider-handle'), { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(document, { clientX: 100, clientY: 100 })
    fireEvent.mouseUp(document)
    expect(ariaValueNow()).toBe('50')
  })

  it('容器宽为 0 时点击轨道不更新', async () => {
    mockZeroRect()
    render(<Tool />)
    await uploadBoth()
    fireEvent.mouseDown(screen.getByTestId('compare-track'), { clientX: 100, clientY: 100 })
    expect(ariaValueNow()).toBe('50')
  })

  it('切换 vertical 方向：clipPath 与分隔线定位随之变化', async () => {
    render(<Tool />)
    await uploadBoth()
    fireEvent.change(screen.getByTestId('opt-direction'), { target: { value: 'vertical' } })
    const before = screen.getByTestId('img-before') as HTMLElement
    expect(before.style.clipPath).toBe('inset(0 0 50% 0)')
    expect(screen.getByTestId('slider-handle').style.top).toBe('50%')
    // vertical 下拖拽取纵轴：clientY=200 → (200-0)/600=33（四舍五入）
    fireEvent.mouseDown(screen.getByTestId('slider-handle'), { clientX: 999, clientY: 200 })
    expect(ariaValueNow()).toBe('33')
  })

  it('重置清空两张图并回到 50', async () => {
    render(<Tool />)
    await uploadBoth()
    fireEvent.mouseDown(screen.getByTestId('compare-track'), { clientX: 600, clientY: 300 })
    expect(ariaValueNow()).toBe('75')
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('compare-area')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
    // 重新上传后百分比回到 50
    await uploadBoth()
    expect(ariaValueNow()).toBe('50')
  })

  it('只传图 A 后重置', async () => {
    render(<Tool />)
    await uploadTo('file-before', makeFile('before.png'))
    await waitFor(() => expect(screen.getByTestId('reset')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-0')
  })

  it('只传图 B 后重置', async () => {
    render(<Tool />)
    await uploadTo('file-after', makeFile('after.png'))
    await waitFor(() => expect(screen.getByTestId('reset')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('reset')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-0')
  })

  it('重新上传同槽位释放旧 object URL', async () => {
    render(<Tool />)
    await uploadTo('file-before', makeFile('before.png'))
    await waitFor(() =>
      expect(screen.getByTestId('drop-before').textContent).toContain('before.png'),
    )
    await uploadTo('file-before', makeFile('before2.png'))
    await waitFor(() =>
      expect(screen.getByTestId('drop-before').textContent).toContain('before2.png'),
    )
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-0')
  })

  it('非图片文件报错且不显示对比区', async () => {
    render(<Tool />)
    await uploadTo('file-before', makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error-before')).toBeTruthy())
    expect(screen.queryByTestId('compare-area')).toBeNull()
  })

  it('超大文件报错', async () => {
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: MAX_FILE_SIZE + 1 })
    render(<Tool />)
    await uploadTo('file-after', big)
    await waitFor(() => expect(screen.getByTestId('error-after')).toBeTruthy())
    expect(screen.queryByTestId('compare-area')).toBeNull()
  })

  it('图 B 加载失败单独报错，不影响图 A', async () => {
    // once 队列按注册顺序消费：第一次调用（图 A）成功，第二次调用（图 B）失败
    mockLoadImage.mockImplementationOnce(async () => ({ width: 800, height: 600 }) as never)
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败B'))
    render(<Tool />)
    await uploadTo('file-before', makeFile('before.png'))
    await waitFor(() =>
      expect(screen.getByTestId('drop-before').textContent).toContain('before.png'),
    )
    await uploadTo('file-after', makeFile('after.png'))
    await waitFor(() =>
      expect(screen.getByTestId('error-after').textContent).toContain('解码失败B'),
    )
    expect(screen.queryByTestId('error-before')).toBeNull()
    expect(screen.queryByTestId('compare-area')).toBeNull()
  })

  it('空 files 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-before') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('拖拽中途重置不崩溃', async () => {
    render(<Tool />)
    await uploadBoth()
    fireEvent.mouseDown(screen.getByTestId('slider-handle'), { clientX: 200, clientY: 300 })
    fireEvent.click(screen.getByTestId('reset'))
    // 容器已卸载，document 上的 mousemove 应被空守卫忽略
    fireEvent.mouseMove(document, { clientX: 400, clientY: 300 })
    fireEvent.mouseUp(document)
    expect(screen.queryByTestId('compare-area')).toBeNull()
  })

  it('拖拽悬停高亮投放区，drop 可上传', async () => {
    render(<Tool />)
    const dropBefore = screen.getByTestId('drop-before')
    const dropAfter = screen.getByTestId('drop-after')
    fireEvent.dragOver(dropBefore, { dataTransfer: { files: [] } })
    expect(dropBefore.className).toContain('border-blue-500')
    fireEvent.dragLeave(dropBefore)
    expect(dropBefore.className).not.toContain('border-blue-500')
    fireEvent.dragOver(dropAfter, { dataTransfer: { files: [] } })
    expect(dropAfter.className).toContain('border-blue-500')
    fireEvent.dragLeave(dropAfter)
    expect(dropAfter.className).not.toContain('border-blue-500')
    await act(async () => {
      fireEvent.drop(dropBefore, { dataTransfer: { files: [makeFile('before.png')] } })
    })
    await waitFor(() =>
      expect(screen.getByTestId('drop-before').textContent).toContain('before.png'),
    )
    await act(async () => {
      fireEvent.drop(dropAfter, { dataTransfer: { files: [makeFile('after.png')] } })
    })
    await waitFor(() => expect(screen.getByTestId('drop-after').textContent).toContain('after.png'))
    await waitFor(() => expect(screen.getByTestId('compare-area')).toBeTruthy())
  })
})
