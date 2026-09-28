// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

// i18n 键由仓库流程稍后统一合并；此处只断言 data-testid 结构、data-status
// 与 utils 抛出的原始中文错误文案，不断言 t() 翻译文案
// （键缺失时 t() 返回 undefined，不渲染）。

const ctxStore = vi.hoisted(() => ({
  translateCalls: [] as number[][],
  rotateCalls: [] as number[],
  drawImageCalls: 0,
}))

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(async () => new Blob(['r'], { type: 'image/jpeg' })),
  createCanvas: vi.fn((w: number, h: number) => ({
    width: w,
    height: h,
    getContext: () => ({
      translate: vi.fn((x: number, y: number) => {
        ctxStore.translateCalls.push([x, y])
      }),
      rotate: vi.fn((rad: number) => {
        ctxStore.rotateCalls.push(rad)
      }),
      drawImage: vi.fn(() => {
        ctxStore.drawImageCalls += 1
      }),
    }),
  })),
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
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

afterEach(() => {
  cleanup()
})

function makeFile(name = 'photo.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function upload(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

async function startProcess() {
  await act(async () => {
    fireEvent.click(screen.getByTestId('process'))
  })
}

/** 逐项状态走 data-status 属性断言，不依赖 i18n 文案 */
function itemStatus(index: number): string | null {
  return screen.getByTestId(`item-${index}`).getAttribute('data-status')
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxStore.translateCalls.length = 0
  ctxStore.rotateCalls.length = 0
  ctxStore.drawImageCalls = 0
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockCanvasToBlob.mockImplementation(async () => new Blob(['r'], { type: 'image/jpeg' }))
})

describe('rotate-batch 组件', () => {
  it('渲染投放区、快捷角度与全部选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-angle-preset')).toBeTruthy()
    expect(screen.getByTestId('opt-angle-preset-90')).toBeTruthy()
    expect(screen.getByTestId('opt-angle-preset-180')).toBeTruthy()
    expect(screen.getByTestId('opt-angle-preset-270')).toBeTruthy()
    expect(screen.getByTestId('opt-angle')).toBeTruthy()
    expect(screen.getByTestId('opt-format')).toBeTruthy()
    expect(screen.getByTestId('opt-quality')).toBeTruthy()
    expect(screen.getByTestId('process')).toBeTruthy()
    // 未选文件时无进度 / 结果 / 取消 / 重置
    expect(screen.queryByTestId('progress')).toBeNull()
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(screen.queryByTestId('cancel')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('投放区为 label 且文件输入支持多选', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = screen.getByTestId('file-input') as HTMLInputElement
    expect(zone.contains(input)).toBe(true)
    expect(input.multiple).toBe(true)
  })

  it('快捷角度直接设定统一角度（不累加，区别于 #423）', async () => {
    render(<Tool />)
    const angleInput = screen.getByTestId('opt-angle') as HTMLInputElement
    // 默认 90°；先改成自定义 45°
    await act(async () => {
      fireEvent.change(angleInput, { target: { value: '45' } })
    })
    expect(angleInput.value).toBe('45')
    // 点 180° 预设 → 直接设为 180，而非 45+180 累加
    fireEvent.click(screen.getByTestId('opt-angle-preset-180'))
    expect(angleInput.value).toBe('180')
    fireEvent.click(screen.getByTestId('opt-angle-preset-270'))
    expect(angleInput.value).toBe('270')
  })

  it('多张全部成功：逐项下载、缩略图、进度与旋转几何', async () => {
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.jpg', 'image/jpeg')])
    expect(itemStatus(0)).toBe('pending')
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-1')).toBeTruthy())
    expect(screen.getByTestId('download-0')).toBeTruthy()
    expect(itemStatus(0)).toBe('done')
    expect(itemStatus(1)).toBe('done')
    // 结果缩略图用对象 URL
    const thumb = screen.getByTestId('item-0').querySelector('img')
    expect(thumb?.getAttribute('src')).toBe('blob:mock-url')
    // 进度走 JSX 插值：2 / 2，进度条满格
    expect(screen.getByTestId('progress').textContent).toContain('2 / 2')
    const bar = screen.getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('2')
    expect(bar.getAttribute('aria-valuemax')).toBe('2')
    expect(bar.querySelector('div')?.getAttribute('style')).toContain('100%')
    // 800x600 @90°：画布宽高精确互换；居中 translate + 旋转 π/2 + 绘制
    expect(mockCreateCanvas).toHaveBeenCalledWith(600, 800)
    expect(ctxStore.translateCalls[0]).toEqual([300, 400])
    expect(ctxStore.rotateCalls[0]).toBeCloseTo(Math.PI / 2)
    expect(ctxStore.drawImageCalls).toBe(2)
    expect(mockLoadImage).toHaveBeenCalledTimes(2)
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(2)
  })

  it('自定义 45°：画布按包络矩形扩大', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-angle'), { target: { value: '45' } })
    })
    await upload([makeFile('a.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    // 800x600 @45° → 990x990
    expect(mockCreateCanvas).toHaveBeenCalledWith(990, 990)
    expect(ctxStore.rotateCalls[0]).toBeCloseTo(Math.PI / 4)
  })

  it('自定义非法角度：全局报错且不处理', async () => {
    render(<Tool />)
    await upload([makeFile()])
    await act(async () => {
      // number 输入框填 400 触发超范围
      fireEvent.change(screen.getByTestId('opt-angle'), { target: { value: '400' } })
    })
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('角度超出范围'))
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('部分失败：成功项可下载，失败项标失败', async () => {
    mockLoadImage
      .mockImplementationOnce(async () => ({ width: 800, height: 600 }) as never)
      .mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.png')])
    await startProcess()
    await waitFor(() => expect(itemStatus(1)).toBe('error'))
    expect(itemStatus(0)).toBe('done')
    expect(screen.getByTestId('download-0')).toBeTruthy()
    expect(screen.queryByTestId('download-1')).toBeNull()
    // 失败原因来自原始错误（非 i18n），可直接断言
    expect(screen.getByTestId('item-1').textContent).toContain('解码失败')
    expect(screen.getByTestId('progress').textContent).toContain('2 / 2')
  })

  it('取消：等待项标失败，处理中项完成后丢弃结果', async () => {
    const resolvers: Array<(v: unknown) => void> = []
    mockLoadImage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve)
        }) as never,
    )
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.png'), makeFile('c.png'), makeFile('d.png')])
    // 4 张、并发 3：3 个 worker 各取一张挂起，第 4 张等待
    await act(async () => {
      fireEvent.click(screen.getByTestId('process'))
    })
    await waitFor(() => expect(itemStatus(0)).toBe('processing'))
    expect(itemStatus(3)).toBe('pending')
    expect(screen.getByTestId('cancel')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByTestId('cancel'))
    })
    expect(itemStatus(3)).toBe('error')
    // 放行处理中的项：完成后应丢弃结果（无下载按钮），URL 被及时释放
    await act(async () => {
      resolvers.forEach((r) => r({ width: 800, height: 600 }))
    })
    await waitFor(() => expect(screen.queryByTestId('cancel')).toBeNull())
    expect(itemStatus(0)).toBe('processing')
    expect(itemStatus(1)).toBe('processing')
    expect(itemStatus(2)).toBe('processing')
    expect(screen.queryByTestId('download-0')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    expect(screen.getByTestId('progress').textContent).toContain('1 / 4')
  })

  it('格式与质量参与处理：png 时质量不传递', async () => {
    render(<Tool />)
    await act(async () => {
      fireEvent.change(screen.getByTestId('opt-format'), { target: { value: 'png' } })
      fireEvent.change(screen.getByTestId('opt-quality'), { target: { value: '95' } })
    })
    await upload([makeFile('a.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    const [, mimeArg, qualityArg] = mockCanvasToBlob.mock.calls[0]
    expect(mimeArg).toBe('image/png')
    expect(qualityArg).toBeUndefined()
    fireEvent.click(screen.getByTestId('download-0'))
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('a-rotated.png')
  })

  it('逐项下载调用 downloadBlob 且文件名带 -rotated 后缀', async () => {
    render(<Tool />)
    await upload([makeFile('photo.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-0'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toBe('photo-rotated.jpg')
  })

  it('并发不超过 3', async () => {
    let active = 0
    let maxActive = 0
    mockLoadImage.mockImplementation(() => {
      active += 1
      maxActive = Math.max(maxActive, active)
      return new Promise((resolve) => {
        setTimeout(() => {
          active -= 1
          resolve({ width: 800, height: 600 })
        }, 10)
      }) as never
    })
    render(<Tool />)
    await upload([1, 2, 3, 4, 5].map((i) => makeFile(`p${i}.png`)))
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-4')).toBeTruthy())
    expect(maxActive).toBeLessThanOrEqual(3)
  })

  it('超过 20 张拒绝且不开始处理', async () => {
    render(<Tool />)
    await upload(Array.from({ length: 21 }, (_, i) => makeFile(`p${i}.png`)))
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(mockLoadImage).not.toHaveBeenCalled()
  })

  it('非图片文件逐项标失败', async () => {
    render(<Tool />)
    await upload([makeFile('a.txt', 'text/plain')])
    await startProcess()
    await waitFor(() => expect(itemStatus(0)).toBe('error'))
    expect(screen.queryByTestId('download-0')).toBeNull()
  })

  it('超 50MB 文件逐项标失败', async () => {
    render(<Tool />)
    const big = makeFile('big.png')
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 })
    await upload([big])
    await startProcess()
    await waitFor(() => expect(itemStatus(0)).toBe('error'))
    expect(screen.getByTestId('item-0').textContent).toContain('文件过大')
  })

  it('Canvas 2D 不可用时逐项标失败', async () => {
    mockCreateCanvas.mockImplementationOnce(
      () => ({ width: 800, height: 600, getContext: () => null }) as never,
    )
    render(<Tool />)
    await upload([makeFile()])
    await startProcess()
    await waitFor(() => expect(itemStatus(0)).toBe('error'))
    expect(screen.getByTestId('item-0').textContent).toContain('Canvas 2D 上下文不可用')
  })

  it('无文件时点开始处理不启动', async () => {
    render(<Tool />)
    await startProcess()
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('重新处理释放上一轮 URL 并重置状态', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    const revoked = vi.mocked(URL.revokeObjectURL).mock.calls.length
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    expect(vi.mocked(URL.revokeObjectURL).mock.calls.length).toBeGreaterThan(revoked)
    expect(mockCanvasToBlob).toHaveBeenCalledTimes(2)
  })

  it('重新选择文件替换旧列表并释放旧 URL', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    await upload([makeFile('b.png'), makeFile('c.png')])
    expect(URL.revokeObjectURL).toHaveBeenCalled()
    expect(itemStatus(0)).toBe('pending')
    expect(itemStatus(1)).toBe('pending')
    expect(screen.getByTestId('progress').textContent).toContain('0 / 2')
  })

  it('重新选择文件时上一轮未完成项不释放 URL', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    await upload([makeFile('b.png')])
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    expect(itemStatus(0)).toBe('pending')
  })

  it('重置清空列表', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    await startProcess()
    await waitFor(() => expect(screen.getByTestId('download-0')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(screen.queryByTestId('progress')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('重置未完成项不触碰 URL 释放', async () => {
    render(<Tool />)
    await upload([makeFile('a.png')])
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('drop 的 files 为 null 时不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: null } })
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile('d.png')] } })
    })
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    expect(itemStatus(0)).toBe('pending')
  })
})
