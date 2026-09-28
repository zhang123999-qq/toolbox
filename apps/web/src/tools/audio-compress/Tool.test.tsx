// @vitest-environment jsdom
/**
 * audio-compress 组件测试
 *
 * @ffmpeg/ffmpeg 用 vi.mock 整体模拟：成功压缩返回假数据；
 * 加载失败分支通过 mockState 开关覆盖。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockState = vi.hoisted(() => ({ loadShouldFail: false, execCode: 0 }))

vi.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: class MockFFmpeg {
    async load(): Promise<void> {
      if (mockState.loadShouldFail) throw new Error('network down')
    }
    async writeFile(_path: string, _data: Uint8Array): Promise<boolean> {
      return true
    }
    async exec(_args: string[]): Promise<number> {
      return mockState.execCode
    }
    async readFile(_path: string): Promise<Uint8Array> {
      return new Uint8Array([73, 68, 51, 4, 5, 6])
    }
  },
}))

import Tool from './Tool'
import { encodeWavPcm, makeSineTone } from './utils'

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
  mockState.execCode = 0
})

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

/** 用 utils 纯函数造一个 2 秒测试 WAV 文件 */
function makeTestFile(name: string, seconds = 2): File {
  const wav = encodeWavPcm(makeSineTone(44100, seconds, 330))
  return new File([wav], name, { type: 'audio/wav' })
}

describe('audio-compress · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口与示例音频按钮', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('example-audio')).toBeTruthy()
  })

  it('载入示例音频 → 压缩成功，播放器出现并显示报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('示例-440Hz正弦波.wav')
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('压缩配置')
    expect(info).toContain('压缩比')
  })

  it('选择文件上传 → 自动压缩', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('upload.wav')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('upload.wav')
    const link = byTestId('download-audio') as HTMLAnchorElement
    expect(link.getAttribute('download')).toMatch(/upload-128k\.mp3$/)
  })

  it('自定义比特率非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-bitrateKbps'), { target: { value: '1' } })
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('比特率非法')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('ffmpeg 内核加载失败 → 中文错误提示并优雅降级', async () => {
    mockState.loadShouldFail = true
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('ffmpeg')
    expect(screen.queryByTestId('player')).toBeNull()
  })

  it('下载音频按钮指向生成的 blob URL', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const link = byTestId('download-audio') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toMatch(/-128k\.mp3$/)
  })
})
