// @vitest-environment jsdom
/**
 * ppt-view 组件测试
 *
 * 用内嵌的最小 pptx base64 fixture（两张幻灯片：文本片 + 空白片）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

/** base64 → Uint8Array（jsdom 下 atob 可用） */
function bytesFromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/**
 * 最小 pptx：slide1（标题一 + 要点 <1>），slide2（空白）。
 * 由脚本现场生成后内嵌（见 test.ts 的 buildPptx 同构逻辑）。
 */
const PPTX_DEMO =
  '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'

function pptxFile(): File {
  return new File([bytesFromBase64(PPTX_DEMO)], 'demo.pptx', {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  })
}

describe('ppt-view · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.queryByTestId('file-name')).toBeNull()
  })

  it('选择 .pptx 后逐张预览文本', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pptxFile()] } })
    await waitFor(() => expect(byTestId('slide-content')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('slide-counter').textContent).toContain('第 1 / 2 张')
    expect(byTestId('slide-content').textContent).toContain('标题一')
    expect(byTestId('slide-content').textContent).toContain('要点 <1>')
    expect(byTestId('file-name').textContent).toBe('demo.pptx')
  })

  it('上一张 / 下一张切换幻灯片（含循环）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pptxFile()] } })
    await waitFor(() => expect(byTestId('slide-content')).toBeTruthy(), { timeout: 15000 })
    fireEvent.click(byTestId('next-slide'))
    expect(byTestId('slide-counter').textContent).toContain('第 2 / 2 张')
    expect(byTestId('slide-content').textContent).toContain('空白幻灯片')
    fireEvent.click(byTestId('next-slide'))
    expect(byTestId('slide-counter').textContent).toContain('第 1 / 2 张')
    fireEvent.click(byTestId('prev-slide'))
    expect(byTestId('slide-counter').textContent).toContain('第 2 / 2 张')
  })

  it('损坏文件给出中文错误', async () => {
    render(<Tool />)
    const bad = new File([new Uint8Array([1, 2, 3])], 'bad.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(byTestId('ppt-error')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('ppt-error').textContent).toContain('文件解析失败')
  })

  it('旧版 .ppt 给出专门提示', async () => {
    render(<Tool />)
    const old = new File(['x'], 'old.ppt', { type: 'application/vnd.ms-powerpoint' })
    fireEvent.change(byTestId('file'), { target: { files: [old] } })
    await waitFor(() => expect(byTestId('ppt-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('ppt-error').textContent).toContain('暂不支持旧版 .ppt')
  })

  it('非 pptx 文件给出中文错误', async () => {
    render(<Tool />)
    const bad = new File(['x'], 'demo.txt', { type: 'text/plain' })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(byTestId('ppt-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('ppt-error').textContent).toContain('请选择 .pptx 文件')
  })
})
