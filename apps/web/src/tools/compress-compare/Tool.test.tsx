// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  canvasToBlob: vi.fn(),
  downloadBlob: vi.fn(),
  drawScaled: vi.fn(() => ({ width: 800, height: 600 })),
  formatBytes: (n: number) => `${n} B`,
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  loadImageFromBlob: vi.fn(async () => ({ width: 800, height: 600 })),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,preview'),
}))

import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'

const mockCanvasToBlob = vi.mocked(canvasToBlob)
const mockDownloadBlob = vi.mocked(downloadBlob)
const mockDrawScaled = vi.mocked(drawScaled)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockLoadImage = vi.mocked(loadImageFromBlob)

const SCHEME_IDS = ['jpeg-q90', 'jpeg-q70', 'jpeg-q50', 'webp-q80', 'webp-q60', 'png']

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

async function toggleScheme(id: string) {
  await act(async () => {
    fireEvent.click(screen.getByTestId(`scheme-${id}`))
  })
}

function cardIds(): string[] {
  return SCHEME_IDS.filter((id) => screen.queryByTestId(`card-${id}`))
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockLoadImage.mockImplementation(async () => ({ width: 800, height: 600 }) as never)
  mockDrawScaled.mockImplementation(() => ({ width: 800, height: 600 }) as never)
  // 按方案返回不同体积：jpeg-q50 最小（500），png 最大（5000），保证「最小」徽标可判定
  mockCanvasToBlob.mockImplementation(
    async (_canvas: HTMLCanvasElement, mime: string, quality?: number) => {
      const size = mime === 'image/png' ? 5000 : Math.round((quality ?? 1) * 1000)
      return new Blob([new Uint8Array(size)], { type: mime })
    },
  )
})

describe('compress-compare 组件', () => {
  it('渲染投放区、6 组方案开关（默认全选）与对比按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.getByTestId('compare')).toBeTruthy()
    for (const id of SCHEME_IDS) {
      const box = screen.getByTestId(`scheme-${id}`) as HTMLInputElement
      expect(box.type).toBe('checkbox')
      expect(box.checked).toBe(true)
    }
  })

  it('无文件时点击对比不执行', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('compare'))
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('上传图片后 6 组方案串行生成、原图卡片与最小徽标', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('original-card')).toBeTruthy()
    expect(cardIds()).toEqual(SCHEMES_IDS_SAFE())
    // 串行：调用顺序与方案顺序一致
    const calls = mockCanvasToBlob.mock.calls.map((c) => `${c[1]}:${c[2]}`)
    expect(calls).toEqual([
      'image/jpeg:0.9',
      'image/jpeg:0.7',
      'image/jpeg:0.5',
      'image/webp:0.8',
      'image/webp:0.6',
      'image/png:undefined',
    ])
    // 体积最小的 jpeg-q50 标「最小」徽标，且全场唯一
    expect(screen.getByTestId('best-jpeg-q50')).toBeTruthy()
    const badges = document.querySelectorAll('[data-testid^="best-"]')
    expect(badges.length).toBe(1)
  })

  it('处理中显示 processing 状态', async () => {
    let resolveBlob!: (b: Blob) => void
    mockCanvasToBlob.mockImplementationOnce(
      () =>
        new Promise<Blob>((r) => {
          resolveBlob = r
        }),
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile()] } })
    await screen.findByTestId('processing')
    await act(async () => {
      resolveBlob(new Blob(['x'], { type: 'image/jpeg' }))
    })
    await waitFor(() => expect(screen.queryByTestId('processing')).toBeNull())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('部分方案禁用后只生成启用的组', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const callsBefore = mockCanvasToBlob.mock.calls.length
    await toggleScheme('jpeg-q90')
    await toggleScheme('png')
    await waitFor(() => expect(cardIds()).toEqual(['jpeg-q70', 'jpeg-q50', 'webp-q80', 'webp-q60']))
    // 两次重新对比：第一次 5 组、第二次 4 组
    expect(mockCanvasToBlob.mock.calls.length).toBe(callsBefore + 5 + 4)
    expect(screen.queryByTestId('card-jpeg-q90')).toBeNull()
    expect(screen.queryByTestId('card-png')).toBeNull()
  })

  it('全部取消勾选时提示至少保留 1 组且不执行', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    for (const id of SCHEME_IDS) {
      await toggleScheme(id)
    }
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('至少启用 1 组'))
    expect(screen.queryByTestId('result')).toBeNull()
    // 重新勾选 1 组后恢复对比
    await toggleScheme('webp-q80')
    await waitFor(() => expect(cardIds()).toEqual(['webp-q80']))
  })

  it('重新对比按钮用当前方案重新生成', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockCanvasToBlob.mock.calls.length
    fireEvent.click(screen.getByTestId('compare'))
    await waitFor(() => expect(mockCanvasToBlob.mock.calls.length).toBe(calls + 6))
  })

  it('单卡下载调用 downloadBlob 且文件名带方案后缀', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-jpeg-q70'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(name).toMatch(/photo-q70\.jpg$/)
  })

  it('上传非图片时不解码、不出结果', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    // 非图片被拒：未尝试解码、无结果卡片（错误文本依赖 i18n 合并，见交付报告键表）
    await waitFor(() => expect(mockLoadImage).not.toHaveBeenCalled())
    await waitFor(() => expect(mockCanvasToBlob).not.toHaveBeenCalled())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('图片解码失败显示错误', async () => {
    mockLoadImage.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('重置清空状态并释放 objectURL', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(URL.revokeObjectURL).toHaveBeenCalled()
  })

  it('无原图时切换方案不触发处理', async () => {
    render(<Tool />)
    await toggleScheme('png')
    expect(mockLoadImage).not.toHaveBeenCalled()
    expect((screen.getByTestId('scheme-png') as HTMLInputElement).checked).toBe(false)
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

/** SCHEMES 顺序的快照，避免测试与实现共用同一常量导致恒真 */
function SCHEMES_IDS_SAFE(): string[] {
  return ['jpeg-q90', 'jpeg-q70', 'jpeg-q50', 'webp-q80', 'webp-q60', 'png']
}
