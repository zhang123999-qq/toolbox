// @vitest-environment jsdom
/**
 * video-format 组件测试
 *
 * 本工具只读文件头魔数，不解码：File.slice 在 jsdom 下可用，无需模拟浏览器 API。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('video-format · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口与示例视频按钮', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('example-video')).toBeTruthy()
  })

  it('载入示例视频 → 识别为 MP4 视频', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-video'))
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('识别结果：MP4 视频')
    expect(info).toContain('isom')
  })

  it('上传 AVI 头（RIFF....AVI ）→ 识别为 AVI 视频', async () => {
    render(<Tool />)
    const head = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x41, 0x56, 0x49, 0x20])
    fireEvent.change(byTestId('file'), {
      target: { files: [new File([head], 'movie.avi', { type: 'video/avi' })] },
    })
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('识别结果：AVI 视频')
  })

  it('上传未知魔数 → 未知格式中文说明', async () => {
    render(<Tool />)
    const head = new Uint8Array([0x5a, 0x5a, 0x5a, 0x5a, 1, 2, 3, 4])
    fireEvent.change(byTestId('file'), {
      target: { files: [new File([head], 'mystery.bin')] },
    })
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('识别结果：未知格式')
  })

  it('空文件 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), {
      target: { files: [new File([], 'empty.mp4', { type: 'video/mp4' })] },
    })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('文件为空')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })
})
