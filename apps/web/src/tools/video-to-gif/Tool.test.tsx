// @vitest-environment jsdom
/**
 * video-to-gif 组件测试
 *
 * @ffmpeg/ffmpeg 用 vi.mock 整体模拟：成功转换返回假数据；
 * 加载失败 / 转码失败分支通过 mockState 开关覆盖。
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
      return new Uint8Array([71, 73, 70, 56, 1, 2, 3, 4])
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
  mockState.execCode = 0
})

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

/** 造一个假视频文件（内容不重要，ffmpeg 已 mock） */
function makeTestFile(name: string): File {
  return new File([new Uint8Array([0, 0, 0, 1])], name, { type: 'video/mp4' })
}

describe('video-to-gif · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
  })

  it('选择视频文件 → 转 GIF 成功，预览出现并显示报告', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('movie.mp4')
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('截取片段')
    expect(info).toContain('帧率：10 fps')
  })

  it('帧率非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-fps'), { target: { value: '99' } })
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('帧率非法')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('ffmpeg 内核加载失败 → 中文错误提示并优雅降级', async () => {
    mockState.loadShouldFail = true
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('ffmpeg')
    expect(screen.queryByTestId('player')).toBeNull()
  })

  it('ffmpeg 转码返回非零退出码 → 中文错误提示', async () => {
    mockState.execCode = 1
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('退出码 1')
  })

  it('下载 GIF 按钮指向生成的 blob URL', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const link = byTestId('download-image') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toMatch(/movie\.gif$/)
  })
})
