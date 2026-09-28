// @vitest-environment jsdom
/**
 * subtitle-extract 组件测试
 *
 * @ffmpeg/ffmpeg 用 vi.mock 整体模拟，不加载真实 wasm：
 * 探测（无 -map 参数）时通过 log 事件吐出假流信息；
 * 提取（带 -map 参数）时返回假 SRT 数据。
 * 加载失败 / 无字幕流 / 提取失败分支通过 mockState 开关覆盖。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockState = vi.hoisted(() => ({
  loadShouldFail: false,
  extractShouldFail: false,
  noSubtitleStreams: false,
  logHandlers: [] as Array<(e: { message: string }) => void>,
}))

const PROBE_LOGS = [
  "Input #0, matroska,webm, from 'movie.mkv':",
  '  Duration: 00:01:23.45, start: 0.000000, bitrate: 1200 kb/s',
  '  Stream #0:0(eng): Video: h264',
  '  Stream #0:1(eng): Audio: aac',
  '  Stream #0:2(eng): Subtitle: subrip (default)',
  '  Stream #0:3(chi): Subtitle: ass',
]

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: class MockFFmpeg {
    async load(): Promise<void> {
      if (mockState.loadShouldFail) throw new Error('network down')
    }
    on(_event: string, cb: (e: { message: string }) => void): void {
      mockState.logHandlers.push(cb)
    }
    async writeFile(_path: string, _data: Uint8Array): Promise<boolean> {
      return true
    }
    async exec(args: string[]): Promise<number> {
      if (args.includes('-map')) {
        return mockState.extractShouldFail ? 1 : 0
      }
      // 探测：ffmpeg -i 以非 0 退出，流信息走 log 事件
      if (!mockState.noSubtitleStreams) {
        for (const message of PROBE_LOGS) {
          for (const h of mockState.logHandlers) h({ message })
        }
      }
      return 1
    }
    async readFile(_path: string): Promise<Uint8Array> {
      return new TextEncoder().encode('1\n00:00:00,000 --> 00:00:01,000\nHello\n')
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
  mockState.loadShouldFail = false
  mockState.extractShouldFail = false
  mockState.noSubtitleStreams = false
  mockState.logHandlers = []
})

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('subtitle-extract · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口、示例视频按钮与字幕格式下拉框', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('example-video')).toBeTruthy()
    const select = byTestId('format') as HTMLSelectElement
    expect(select.textContent).toContain('SRT')
    expect(select.textContent).toContain('WebVTT')
    expect(select.textContent).toContain('ASS')
  })

  it('载入示例视频 → 探测到 2 路字幕流并列出', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-video'))
    await waitFor(() => expect(byTestId('stream-0')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('stream-1')).toBeTruthy()
    expect(screen.queryByTestId('stream-2')).toBeNull()
    expect(byTestId('extract')).toBeTruthy()
  })

  it('提取字幕 → 下载链接出现并显示报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-video'))
    await waitFor(() => expect(byTestId('extract')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('extract'))
    await waitFor(() => expect(byTestId('download-subtitle')).toBeTruthy(), { timeout: 10000 })
    const link = byTestId('download-subtitle') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toBe('示例-sub0.srt')
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('第 1 路')
    expect(info).toContain('输出格式：SRT')
    expect(info).toContain('时长 83.45 秒')
  })

  it('切换字幕流与输出格式后提取，文件名随之变化', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-video'))
    await waitFor(() => expect(byTestId('extract')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('stream-1'))
    fireEvent.change(byTestId('format'), { target: { value: 'vtt' } })
    fireEvent.click(byTestId('extract'))
    await waitFor(() => expect(byTestId('download-subtitle')).toBeTruthy(), { timeout: 10000 })
    const link = byTestId('download-subtitle') as HTMLAnchorElement
    expect(link.getAttribute('download')).toBe('示例-sub1.vtt')
    expect(byTestId('result-info').textContent).toContain('输出格式：WebVTT')
  })

  it('视频无字幕流 → 中文错误提示', async () => {
    mockState.noSubtitleStreams = true
    render(<Tool />)
    fireEvent.click(byTestId('example-video'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('未检测到字幕流')
    expect(screen.queryByTestId('extract')).toBeNull()
  })

  it('ffmpeg 内核加载失败 → 中文错误提示', async () => {
    mockState.loadShouldFail = true
    render(<Tool />)
    fireEvent.click(byTestId('example-video'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('ffmpeg 内核加载失败')
  })

  it('提取失败（退出码非 0）→ 中文错误提示', async () => {
    mockState.extractShouldFail = true
    render(<Tool />)
    fireEvent.click(byTestId('example-video'))
    await waitFor(() => expect(byTestId('extract')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('extract'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('提取失败：ffmpeg 返回退出码 1')
  })
})
