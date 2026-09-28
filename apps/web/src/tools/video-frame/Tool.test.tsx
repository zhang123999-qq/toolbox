// @vitest-environment jsdom
/**
 * video-frame 组件测试
 *
 * video/canvas 行为全 mock：伪造元数据、seeked 事件、canvas 2d 上下文，
 * 验证抓帧流程与错误提示。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

const drawImage = vi.fn()
let toDataURLSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  drawImage.mockClear()
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:mock-video'),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage,
    canvas: {},
  } as unknown as CanvasRenderingContext2D)
  toDataURLSpy = vi
    .spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue('data:image/png;base64,AAA')
})

/** 伪造视频元数据并触发 loadedmetadata */
function loadVideo(): HTMLVideoElement {
  const file = new File(['x'], 'movie.mp4', { type: 'video/mp4' })
  const input = byTestId('video-input') as HTMLInputElement
  fireEvent.change(input, { target: { files: [file] } })
  const video = byTestId('video') as HTMLVideoElement
  Object.defineProperties(video, {
    duration: { value: 120, configurable: true },
    videoWidth: { value: 640, configurable: true },
    videoHeight: { value: 360, configurable: true },
  })
  fireEvent(video, new Event('loadedmetadata'))
  return video
}

describe('video-frame · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件选择器、时间输入与抓帧按钮', () => {
    render(<Tool />)
    expect(byTestId('video-input')).toBeTruthy()
    expect(byTestId('time-input')).toBeTruthy()
    expect((byTestId('capture') as HTMLButtonElement).disabled).toBe(true)
  })

  it('选择视频后显示时长与分辨率', () => {
    render(<Tool />)
    loadVideo()
    expect(byTestId('frame-status').textContent).toContain('02:00.000')
    expect(byTestId('frame-status').textContent).toContain('640×360')
    expect((byTestId('capture') as HTMLButtonElement).disabled).toBe(false)
    expect(byTestId('seek')).toBeTruthy()
  })

  it('抓帧 → seek 后绘制 canvas 并显示预览与下载', () => {
    render(<Tool />)
    const video = loadVideo()
    fireEvent.change(byTestId('time-input'), { target: { value: '1:30.5' } })
    fireEvent.click(byTestId('capture'))
    expect(video.currentTime).toBe(90.5)
    act(() => {
      fireEvent(video, new Event('seeked'))
    })
    expect(drawImage).toHaveBeenCalled()
    expect(toDataURLSpy!).toHaveBeenCalled()
    const preview = byTestId('frame-preview') as HTMLImageElement
    expect(preview.src).toContain('data:image/png')
    const dl = byTestId('download-frame') as HTMLAnchorElement
    expect(dl.download).toBe('movie_frame_01-30-500.png')
    expect(byTestId('frame-status').textContent).toContain('已抓取 01:30.500 的画面')
  })

  it('时间非法 → 中文错误提示', () => {
    render(<Tool />)
    loadVideo()
    fireEvent.change(byTestId('time-input'), { target: { value: '999' } })
    fireEvent.click(byTestId('capture'))
    expect(byTestId('error').textContent).toContain('超过视频时长')
  })

  it('时间格式非法 → 中文错误提示', () => {
    render(<Tool />)
    loadVideo()
    fireEvent.change(byTestId('time-input'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('capture'))
    expect(byTestId('error').textContent).toContain('时间非法')
  })

  it('未选视频时抓帧按钮禁用', () => {
    render(<Tool />)
    expect((byTestId('capture') as HTMLButtonElement).disabled).toBe(true)
  })

  it('滑杆拖动 → 时间输入框同步', () => {
    render(<Tool />)
    loadVideo()
    const seek = byTestId('seek') as HTMLInputElement
    fireEvent.change(seek, { target: { value: '500' } })
    expect((byTestId('time-input') as HTMLInputElement).value).toBe('60.00')
  })
})
