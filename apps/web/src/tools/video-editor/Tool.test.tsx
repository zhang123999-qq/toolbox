// @vitest-environment jsdom
/**
 * video-editor 组件测试
 *
 * @ffmpeg/ffmpeg 用 vi.mock 整体模拟；片段增删改 / 排序 / 校验走真实 utils；
 * 导出流程走 mock ffmpeg，验证裁剪与拼接参数。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'

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
import { resetSegmentSeq } from './utils'

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
  resetSegmentSeq()
})

function uploadVideo(name = 'demo.mp4'): void {
  const file = new File(['fake-video-bytes'], name, { type: 'video/mp4' })
  fireEvent.change(screen.getByTestId('video-input'), { target: { files: [file] } })
}

function addSegment(start: string, end: string): void {
  fireEvent.change(screen.getByTestId('seg-start'), { target: { value: start } })
  fireEvent.change(screen.getByTestId('seg-end'), { target: { value: end } })
  fireEvent.click(screen.getByTestId('seg-add'))
}

describe('video-editor 组件', () => {
  it('渲染视频选择、片段表单与导出按钮（初始禁用）', () => {
    render(<Tool />)
    expect(screen.getByTestId('video-input')).toBeTruthy()
    expect(screen.getByTestId('seg-add')).toBeTruthy()
    expect((screen.getByTestId('export') as HTMLButtonElement).disabled).toBe(true)
  })

  it('添加合法片段后出现在列表中', () => {
    render(<Tool />)
    addSegment('0', '10')
    const row = screen.getByTestId('segment-seg-1')
    expect(row.textContent).toContain('#1 00:00.00 → 00:10.00')
    expect((screen.getByTestId('export') as HTMLButtonElement).disabled).toBe(true) // 还没选视频
  })

  it('支持 1:30 写法并清空表单', () => {
    render(<Tool />)
    addSegment('1:00', '1:30')
    expect(screen.getByTestId('segment-seg-1').textContent).toContain('01:00.00 → 01:30.00')
    expect((screen.getByTestId('seg-start') as HTMLInputElement).value).toBe('')
  })

  it('结束时间不大于开始时间时中文报错且不添加', () => {
    render(<Tool />)
    addSegment('10', '5')
    expect(screen.getByTestId('error').textContent).toContain('起始时间必须小于结束时间')
    expect(screen.queryByTestId('segment-list')).toBeNull()
  })

  it('时间格式非法时中文报错', () => {
    render(<Tool />)
    addSegment('abc', '10')
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(screen.queryByTestId('segment-list')).toBeNull()
  })

  it('上移 / 下移调整拼接顺序', () => {
    render(<Tool />)
    addSegment('0', '10')
    addSegment('20', '30')
    // 把第二段上移
    fireEvent.click(within(screen.getByTestId('segment-seg-2')).getByText('上移'))
    const rows = screen.getAllByText(/#\d/, { exact: false })
    expect(rows[0]?.textContent).toContain('00:20.00')
    expect(rows[1]?.textContent).toContain('00:00.00')
    // 首段的上移按钮应禁用
    expect(
      (within(screen.getByTestId('segment-seg-2')).getByText('上移') as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('删除片段', () => {
    render(<Tool />)
    addSegment('0', '10')
    fireEvent.click(within(screen.getByTestId('segment-seg-1')).getByText('删除'))
    expect(screen.queryByTestId('segment-list')).toBeNull()
  })

  it('导出：逐段裁剪后拼接，结果可预览下载', async () => {
    render(<Tool />)
    uploadVideo('demo.mp4')
    addSegment('0', '10')
    addSegment('20', '30')
    fireEvent.click(screen.getByTestId('export'))

    const video = await screen.findByTestId('result-video')
    expect(video.getAttribute('src')).toBe('blob:mock-url')
    expect(screen.getByTestId('download-link').getAttribute('download')).toBe('demo-edit.mp4')

    // 2 次裁剪 + 1 次拼接
    expect(mockState.execCalls).toHaveLength(3)
    expect(mockState.execCalls[0]).toEqual(
      expect.arrayContaining(['-ss', '0.000', '-to', '10.000', '-c', 'copy']),
    )
    expect(mockState.execCalls[1]).toEqual(
      expect.arrayContaining(['-ss', '20.000', '-to', '30.000', '-c', 'copy']),
    )
    expect(mockState.execCalls[2]).toEqual(
      expect.arrayContaining(['-f', 'concat', '-safe', '0', '-c', 'copy']),
    )
  })

  it('ffmpeg 失败时给出中文报错', async () => {
    mockState.execCode = 1
    render(<Tool />)
    uploadVideo()
    addSegment('0', '10')
    fireEvent.click(screen.getByTestId('export'))
    const error = await screen.findByTestId('error')
    expect(error.textContent).toContain('裁剪失败')
  })
})
