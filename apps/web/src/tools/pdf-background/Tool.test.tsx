// @vitest-environment jsdom
/**
 * pdf-background 组件测试
 *
 * 覆盖：必需 testid、自定义文件入口、完整流程（真 PDF 经 pdf-lib 生成）、
 * 未选文件 / 非 PDF 错误态、切换颜色、清空。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PDFDocument } from 'pdf-lib'
import Tool from './Tool'

afterEach(cleanup)

function stubDownloads(): void {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, configurable: true })
}

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

/** 造一个 1 页的真 PDF 文件 */
async function makePdfFile(): Promise<File> {
  const doc = await PDFDocument.create()
  doc.addPage([595.28, 841.89])
  const bytes = await doc.save()
  return new File([new Uint8Array(bytes)], 'demo.pdf', { type: 'application/pdf' })
}

/** 触发文件选择：jsdom 的 input.files 需用 defineProperty 注入 */
function selectFile(file: File): void {
  const input = byTestId('file') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

describe('pdf-background · Tool', () => {
  beforeEach(stubDownloads)

  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('export-pdf')).toBeTruthy()
  })

  it('完整流程：选文件 → 加背景并下载 → 显示页数信息', async () => {
    render(<Tool />)
    selectFile(await makePdfFile())
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('pdf-info').textContent).toMatch(/1 页/), {
      timeout: 10000,
    })
  })

  it('切换背景色后仍能生成', async () => {
    render(<Tool />)
    selectFile(await makePdfFile())
    const select = screen.getByLabelText('背景色') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'blue' } })
    expect(select.value).toBe('blue')
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('pdf-info')).toBeTruthy(), { timeout: 10000 })
  })

  it('未选文件给出中文错误（role=alert）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('export-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('export-error').textContent).toContain('请先选择 PDF 文件')
    expect(byTestId('export-error').getAttribute('role')).toBe('alert')
  })

  it('非 PDF 文件给出中文错误', async () => {
    render(<Tool />)
    selectFile(new File(['hello'], 'demo.txt', { type: 'text/plain' }))
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('export-error').textContent).toContain('请选择 PDF 文件'), {
      timeout: 10000,
    })
  })
})
