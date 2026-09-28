// @vitest-environment jsdom
/**
 * subtitle-burn 组件测试
 *
 * @ffmpeg/ffmpeg 用 vi.mock 整体模拟；字幕解析走真实 utils；
 * 烧录流程走 mock ffmpeg，验证 subtitles 滤镜参数。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mockState = vi.hoisted(() => ({
  execCode: 0,
  execCalls: [] as string[][],
}))

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: class MockFFmpeg {
    async load(): Promise<void> {}
    async writeFile(_path: string, _data: Uint8Array): Promise<boolean> {
      return true
    }
    async exec(args: string[]): Promise<number> {
      mockState.execCalls.push(args)
      return mockState.execCode
    }
    async readFile(_path: string): Promise<Uint8Array> {
      return new Uint8Array([1, 2, 3, 4])
    }
    async deleteFile(_path: string): Promise<boolean> {
      return true
    }
  },
}))

import Tool from './Tool'

afterEach(cleanup)

function stubBrowserApis(): void {
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
  })
}

beforeEach(() => {
  stubBrowserApis()
  mockState.execCode = 0
  mockState.execCalls = []
})

function uploadVideo(name = 'demo.mp4'): void {
  const file = new File(['fake-video-bytes'], name, { type: 'video/mp4' })
  fireEvent.change(screen.getByTestId('video-input'), { target: { files: [file] } })
}

function uploadSubtitleText(text: string, name = 'sub.srt'): void {
  const file = new File([text], name, { type: 'text/plain' })
  fireEvent.change(screen.getByTestId('subtitle-input'), { target: { files: [file] } })
}

const VALID_SRT = `1
00:00:01,000 --> 00:00:04,000
你好。

2
00:00:05,000 --> 00:00:08,000
世界。
`

describe('subtitle-burn 组件', () => {
  it('渲染视频 / 字幕选择与样式选项，烧录按钮初始禁用', () => {
    render(<Tool />)
    expect(screen.getByTestId('video-input')).toBeTruthy()
    expect(screen.getByTestId('subtitle-input')).toBeTruthy()
    expect(screen.getByTestId('font-size')).toBeTruthy()
    expect(screen.getByTestId('font-color')).toBeTruthy()
    expect(screen.getByTestId('position')).toBeTruthy()
    expect((screen.getByTestId('burn') as HTMLButtonElement).disabled).toBe(true)
  })

  it('示例字幕解析出条目数', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('example-subtitle'))
    expect(screen.getByTestId('subtitle-info').textContent).toContain('解析出 2 条字幕')
  })

  it('上传合法 SRT 字幕后显示条目数', async () => {
    render(<Tool />)
    uploadSubtitleText(VALID_SRT)
    expect((await screen.findByTestId('subtitle-info')).textContent).toContain('解析出 2 条字幕')
  })

  it('上传非法字幕给出中文报错', async () => {
    render(<Tool />)
    uploadSubtitleText('这根本不是字幕')
    expect(await screen.findByTestId('error')).toBeTruthy()
    expect(screen.queryByTestId('subtitle-info')).toBeNull()
  })

  it('只选视频不选字幕时烧录按钮保持禁用', () => {
    render(<Tool />)
    uploadVideo()
    expect((screen.getByTestId('burn') as HTMLButtonElement).disabled).toBe(true)
  })

  it('烧录：subtitles 滤镜 + 样式参数正确，结果可预览下载', async () => {
    render(<Tool />)
    uploadVideo('demo.mp4')
    fireEvent.click(screen.getByTestId('example-subtitle'))
    fireEvent.click(screen.getByTestId('burn'))

    const video = await screen.findByTestId('result-video')
    expect(video.getAttribute('src')).toBe('blob:mock-url')
    expect(screen.getByTestId('download-link').getAttribute('download')).toBe('demo-sub.mp4')

    expect(mockState.execCalls).toHaveLength(1)
    const args = mockState.execCalls[0]!
    const vfIndex = args.indexOf('-vf')
    expect(vfIndex).toBeGreaterThan(-1)
    const filter = args[vfIndex + 1]!
    expect(filter).toContain('subtitles=')
    expect(filter).toContain('force_style=')
    expect(filter).toContain('FontSize=24')
    expect(filter).toContain('Alignment=2') // 底部
    expect(args).toContain('-c:a')
    expect(args).toContain('copy')
  })

  it('ffmpeg 失败时给出中文报错', async () => {
    mockState.execCode = 1
    render(<Tool />)
    uploadVideo()
    fireEvent.click(screen.getByTestId('example-subtitle'))
    fireEvent.click(screen.getByTestId('burn'))
    const error = await screen.findByTestId('error')
    expect(error.textContent).toContain('ffmpeg 烧录失败')
  })
})
