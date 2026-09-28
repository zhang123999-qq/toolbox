// @vitest-environment jsdom
/**
 * video-transcode 组件测试
 *
 * @ffmpeg/ffmpeg 用 vi.mock 整体模拟：成功转码返回假数据；
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
      return new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])
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

/**
 * 取带标签的表单控件。MultiPanel 的 select / checkbox 下拉不带 data-testid（模板公共代码，
 * 不在本次 8 个目录内，不动），改用 label 文本定位。
 */
function byLabel(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

/** 造一个假视频文件（内容不重要，ffmpeg 已 mock） */
function makeTestFile(name: string): File {
  return new File([new Uint8Array([0, 0, 0, 1])], name, { type: 'video/mp4' })
}

describe('video-transcode · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口与容器/分辨率选项', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
    expect(byLabel('目标容器')).toBeTruthy()
    expect(byLabel('目标分辨率')).toBeTruthy()
  })

  it('选择视频文件 → 转码成功，播放器出现并显示报告', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('movie.mp4')
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('目标容器：MP4')
    expect(info).toContain('输出大小')
  })

  it('切换 webm → 报告展示 VP9 编码器', async () => {
    render(<Tool />)
    fireEvent.change(byLabel('目标容器'), { target: { value: 'webm' } })
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('libvpx-vp9')
    const link = byTestId('download-video') as HTMLAnchorElement
    expect(link.getAttribute('download')).toMatch(/movie\.webm$/)
  })

  it('容器选项非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byLabel('目标容器'), { target: { value: 'avi' } })
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('目标容器')
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

  it('ffmpeg 返回非零退出码 → 中文错误提示', async () => {
    mockState.execCode = 3
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('退出码 3')
  })

  it('下载视频按钮指向生成的 blob URL', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('movie.mp4')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const link = byTestId('download-video') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toMatch(/movie\.mp4$/)
  })
})
