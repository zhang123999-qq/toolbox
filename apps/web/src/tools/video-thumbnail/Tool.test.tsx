// @vitest-environment jsdom
/**
 * video-thumbnail 组件测试
 *
 * jsdom 没有视频解码：手动触发 video 的 loadedmetadata / seeked 事件来驱动
 * 截取流程，canvas 2d 上下文与 toDataURL 用桩对象代替。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 假 2d 上下文：只实现截取用到的 drawImage */
function makeFakeCtx() {
  return { drawImage: vi.fn() }
}

function stubBrowserApis(): void {
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-video'),
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: vi.fn(makeFakeCtx),
    configurable: true,
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    value: vi.fn(() => 'data:image/png;base64,AAA'),
    configurable: true,
  })
}

beforeEach(stubBrowserApis)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

/** 造一个假视频文件（内容不重要，解码流程由事件驱动） */
function makeTestFile(name: string): File {
  return new File([new Uint8Array([0, 0, 0, 1])], name, { type: 'video/mp4' })
}

/** 模拟浏览器加载出视频元数据 */
function fireLoadedMetadata(video: HTMLVideoElement, duration: number): void {
  Object.defineProperty(video, 'duration', { value: duration, configurable: true })
  Object.defineProperty(video, 'videoWidth', { value: 320, configurable: true })
  Object.defineProperty(video, 'videoHeight', { value: 240, configurable: true })
  fireEvent(video, new Event('loadedmetadata'))
}

/** 逐个回应 seek，驱动截取循环走完 count 个时间点 */
async function driveSeeks(video: HTMLVideoElement, count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await new Promise((r) => setTimeout(r, 50))
    fireEvent(video, new Event('seeked'))
  }
}

describe('video-thumbnail · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口（无示例视频按钮，视频无法合成）', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
  })

  it('选择文件 → 元数据就绪 → 截取出缩略图网格', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    const video = byTestId('video') as HTMLVideoElement
    expect(video.getAttribute('src')).toBe('blob:mock-video')
    fireLoadedMetadata(video, 10)
    await driveSeeks(video, 3)
    await waitFor(() => expect(byTestId('thumbs-grid')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('movie.mp4')
    expect(byTestId('thumb-0')).toBeTruthy()
    expect(byTestId('thumb-2')).toBeTruthy()
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('共 3 张缩略图')
    expect(info).toContain('视频时长：10.00 秒')
    const link = byTestId('download-thumb-1') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('data:image/png;base64,AAA')
    expect(link.getAttribute('download')).toBe('movie-thumb-2.png')
  })

  it('修改时间点后重新截取，数量随之变化', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    const video = byTestId('video') as HTMLVideoElement
    fireLoadedMetadata(video, 10)
    await driveSeeks(video, 3)
    await waitFor(() => expect(byTestId('thumbs-grid')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-timestamps'), { target: { value: '1, 2' } })
    fireEvent.click(byTestId('reprocess'))
    await driveSeeks(video, 2)
    await waitFor(() => expect(byTestId('result-info').textContent).toContain('共 2 张缩略图'), {
      timeout: 10000,
    })
  })

  it('时间点格式非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    const video = byTestId('video') as HTMLVideoElement
    fireLoadedMetadata(video, 10)
    await driveSeeks(video, 3)
    await waitFor(() => expect(byTestId('thumbs-grid')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-timestamps'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('error').textContent).toContain('时间点非法'), {
      timeout: 10000,
    })
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('选文件时时间点已非法 → 直接中文错误提示，不加载视频', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-timestamps'), { target: { value: 'abc' } })
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('error').textContent).toContain('时间点非法'), {
      timeout: 10000,
    })
    expect(byTestId('video').getAttribute('src')).toBeNull()
  })

  it('时间点超出视频时长 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-timestamps'), { target: { value: '99' } })
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    const video = byTestId('video') as HTMLVideoElement
    fireLoadedMetadata(video, 10)
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('超出视频时长')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('读不到视频时长 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('broken.mp4')] } })
    const video = byTestId('video') as HTMLVideoElement
    fireEvent(video, new Event('loadedmetadata')) // duration 保持 NaN
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('视频时长非法')
  })
})
