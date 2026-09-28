// @vitest-environment jsdom
/**
 * video-cut 组件测试
 *
 * @ffmpeg/ffmpeg 一律 mock：覆盖加载成功 / 初始化失败 / 执行失败分支。
 * jsdom 下 video 元素不会触发 loadedmetadata，时长探测保持 null，不影响裁剪流程。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

let failLoad = false
let failExec = false

class MockFFmpeg {
  async load(): Promise<void> {
    if (failLoad) throw new Error('network down')
  }
  async writeFile(): Promise<void> {}
  async exec(): Promise<number> {
    return failExec ? 1 : 0
  }
  async readFile(): Promise<Uint8Array> {
    return new Uint8Array([0x00, 0x00, 0x00, 0x18])
  }
  async deleteFile(): Promise<void> {}
}

vi.mock('@ffmpeg/ffmpeg', () => ({ FFmpeg: MockFFmpeg }))

function stubBrowserApis(): void {
  failLoad = false
  failExec = false
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
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

function selectFile(name = 'clip.mp4'): void {
  const file = new File([new Uint8Array([1, 2, 3])], name, { type: 'video/mp4' })
  fireEvent.change(byTestId('file'), { target: { files: [file] } })
}

describe('video-cut · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    const { container } = render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('cut')).toBeTruthy()
    expect(byTestId('option-start')).toBeTruthy()
    expect(byTestId('option-end')).toBeTruthy()
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
  })

  it('未选文件点裁剪 → 中文提示先选文件', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('cut'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('请先选择视频文件')
  })

  it('选文件 → 开始裁剪 → 播放器与下载链接出现', async () => {
    render(<Tool />)
    selectFile()
    expect(byTestId('file-name').textContent).toContain('clip.mp4')
    fireEvent.change(byTestId('option-start'), { target: { value: '1.0' } })
    fireEvent.change(byTestId('option-end'), { target: { value: '2.0' } })
    fireEvent.click(byTestId('cut'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('裁剪区间：1.00 秒 – 2.00 秒')
    const link = byTestId('download-video') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toBe('clip-cut.mp4')
  })

  it('支持「分:秒」写法输入', async () => {
    render(<Tool />)
    selectFile()
    fireEvent.change(byTestId('option-start'), { target: { value: '0:01' } })
    fireEvent.change(byTestId('option-end'), { target: { value: '0:02' } })
    fireEvent.click(byTestId('cut'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('裁剪区间：1.00 秒 – 2.00 秒')
  })

  it('起止时间非法 → 中文错误提示', async () => {
    render(<Tool />)
    selectFile()
    fireEvent.change(byTestId('option-start'), { target: { value: '3' } })
    fireEvent.change(byTestId('option-end'), { target: { value: '1' } })
    fireEvent.click(byTestId('cut'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('起始时间必须小于结束时间')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('时间格式非法 → 中文错误提示', async () => {
    render(<Tool />)
    selectFile()
    fireEvent.change(byTestId('option-start'), { target: { value: 'abc' } })
    fireEvent.change(byTestId('option-end'), { target: { value: '2' } })
    fireEvent.click(byTestId('cut'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('时间格式非法')
  })

  it('ffmpeg 初始化失败 → 中文错误提示', async () => {
    failLoad = true
    render(<Tool />)
    selectFile()
    fireEvent.click(byTestId('cut'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('视频编码组件初始化失败')
  })

  it('ffmpeg 执行失败（非零退出码）→ 中文错误提示', async () => {
    failExec = true
    render(<Tool />)
    selectFile()
    fireEvent.click(byTestId('cut'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('视频裁剪失败')
  })
})
