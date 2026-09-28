// @vitest-environment jsdom
/**
 * video-merge 组件测试
 *
 * @ffmpeg/ffmpeg 一律 mock；多选文件通过 FileList 构造注入。
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

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

/** jsdom 的 fireEvent.change 不直接支持 FileList：手动构造 */
function selectFiles(names: string[]): void {
  const files = names.map((n) => new File([new Uint8Array([1, 2, 3])], n, { type: 'video/mp4' }))
  const input = byTestId('file') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: files, configurable: true })
  fireEvent.change(input)
}

describe('video-merge · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    const { container } = render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('merge')).toBeTruthy()
    expect(container.querySelector('input[type="checkbox"]')).toBeTruthy()
  })

  it('未选文件点合并 → 中文提示重新选择', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('merge'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('请重新选择')
  })

  it('只选 1 个文件 → 提示至少需要 2 个', async () => {
    render(<Tool />)
    selectFiles(['a.mp4'])
    fireEvent.click(byTestId('merge'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('至少需要 2 个视频')
  })

  it('选 2 个文件 → 合并成功，报告含片段清单', async () => {
    render(<Tool />)
    selectFiles(['a.mp4', 'b.mp4'])
    expect(byTestId('file-list').textContent).toContain('a.mp4')
    fireEvent.click(byTestId('merge'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('已按顺序合并 2 个视频')
    expect(info).toContain('1. a.mp4')
    expect(info).toContain('2. b.mp4')
    const link = byTestId('download-video') as HTMLAnchorElement
    expect(link.getAttribute('download')).toBe('merged.mp4')
  })

  it('关闭重编码开关后合并 → 报告为流拷贝模式', async () => {
    const { container } = render(<Tool />)
    selectFiles(['a.mp4', 'b.mp4'])
    const checkbox = container.querySelector('input[type="checkbox"]')
    if (!checkbox) throw new Error('缺少重编码开关')
    fireEvent.click(checkbox)
    fireEvent.click(byTestId('merge'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('流拷贝')
  })

  it('ffmpeg 初始化失败 → 中文错误提示', async () => {
    failLoad = true
    render(<Tool />)
    selectFiles(['a.mp4', 'b.mp4'])
    fireEvent.click(byTestId('merge'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('视频编码组件初始化失败')
  })

  it('流拷贝模式执行失败 → 提示开启重编码统一', async () => {
    failExec = true
    const { container } = render(<Tool />)
    selectFiles(['a.mp4', 'b.mp4'])
    const checkbox = container.querySelector('input[type="checkbox"]')
    if (!checkbox) throw new Error('缺少重编码开关')
    fireEvent.click(checkbox)
    fireEvent.click(byTestId('merge'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('重编码统一')
  })
})
