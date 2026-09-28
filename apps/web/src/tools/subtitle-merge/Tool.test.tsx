// @vitest-environment jsdom
/**
 * subtitle-merge 组件测试
 *
 * 多文件合并：载入示例 → 按时间轴合并排序；非法文件 → 中文提示。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('subtitle-merge · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    stubBrowserApis()
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('初始无文件 → 提示至少提供一个字幕文件', () => {
    stubBrowserApis()
    render(<Tool />)
    expect(byTestId('error').textContent).toContain('至少提供一个字幕文件')
    expect(screen.queryByTestId('result-text')).toBeNull()
  })

  it('载入示例字幕 → 合并排序并显示统计', () => {
    stubBrowserApis()
    render(<Tool />)
    fireEvent.click(byTestId('example-files'))
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('1\n00:00:01,000 --> 00:00:04,000\n你好，世界')
    // 时间重叠的条目被截断
    expect(out).toContain('00:00:04,000 --> 00:00:06,000')
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('参与文件：2 个')
    expect(info).toContain('合并后')
    expect(byTestId('file-list').textContent).toContain('示例A.srt')
  })

  it('清空文件 → 回到初始提示', () => {
    stubBrowserApis()
    render(<Tool />)
    fireEvent.click(byTestId('example-files'))
    expect(byTestId('result-text')).toBeTruthy()
    fireEvent.click(byTestId('clear-files'))
    expect(byTestId('error').textContent).toContain('至少提供一个字幕文件')
  })

  it('粘贴字幕文本也可参与合并', () => {
    stubBrowserApis()
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '1\n00:00:20,000 --> 00:00:22,000\n粘贴的字幕\n' },
    })
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('粘贴的字幕')
    expect(byTestId('result-info').textContent).toContain('参与文件：1 个')
  })

  it('选择文件上传 → 自动合并', async () => {
    stubBrowserApis()
    render(<Tool />)
    const file = new File(['1\n00:00:01,000 --> 00:00:02,000\n上传的字幕\n'], 'up.srt', {
      type: 'text/plain',
    })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('file-list')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-list').textContent).toContain('up.srt')
    expect(byTestId('result-text').textContent).toContain('上传的字幕')
  })

  it('非法字幕文件 → 中文错误提示并标注文件名', async () => {
    stubBrowserApis()
    render(<Tool />)
    const file = new File(['这不是字幕\n没有时间轴\n'], 'bad.srt', { type: 'text/plain' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('file-list')).toBeTruthy(), { timeout: 10000 })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('文件「bad.srt」解析失败')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('设置偏移 → 时间轴整体后移', () => {
    stubBrowserApis()
    render(<Tool />)
    fireEvent.click(byTestId('example-files'))
    fireEvent.change(byTestId('option-offsetMs'), { target: { value: '1000' } })
    expect(byTestId('result-text').textContent).toContain('00:00:02,000 --> 00:00:05,000')
  })
})
