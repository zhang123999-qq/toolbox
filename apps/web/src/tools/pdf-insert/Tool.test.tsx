// @vitest-environment jsdom
/**
 * pdf-insert 组件测试
 *
 * 覆盖：必需 testid、自定义文件入口、完整流程（真 PDF 经 pdf-lib 生成）、
 * 未选文件 / 非 PDF / 非法页码 / 超范围 / 中文错误态、清空。
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

/** 造一个 2 页的真 PDF 文件 */
async function makePdfFile(): Promise<File> {
  const doc = await PDFDocument.create()
  doc.addPage([595.28, 841.89])
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

describe('pdf-insert · Tool', () => {
  beforeEach(stubDownloads)

  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('input-page')).toBeTruthy()
    expect(byTestId('export-pdf')).toBeTruthy()
  })

  it('完整流程：选文件 → 示例 → 插入并下载 → 显示页数信息', async () => {
    render(<Tool />)
    selectFile(await makePdfFile())
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('pdf-info').textContent).toMatch(/2 页/), {
      timeout: 10000,
    })
  })

  it('未选文件给出中文错误（role=alert）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('export-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('export-error').textContent).toContain('请先选择 PDF 文件')
    expect(byTestId('export-error').getAttribute('role')).toBe('alert')
  })

  it('非 PDF 文件给出中文错误', async () => {
    render(<Tool />)
    selectFile(new File(['hello'], 'demo.txt', { type: 'text/plain' }))
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('export-error').textContent).toContain('请选择 PDF 文件'), {
      timeout: 10000,
    })
  })

  it('非法页码给出中文错误', async () => {
    render(<Tool />)
    selectFile(await makePdfFile())
    fireEvent.change(byTestId('input'), { target: { value: 'Hello' } })
    fireEvent.change(byTestId('input-page'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(
      () => expect(byTestId('export-error').textContent).toContain('页码必须是大于 0 的整数'),
      { timeout: 10000 },
    )
  })

  it('页码超范围给出中文错误', async () => {
    render(<Tool />)
    selectFile(await makePdfFile())
    fireEvent.change(byTestId('input'), { target: { value: 'Hello' } })
    fireEvent.change(byTestId('input-page'), { target: { value: '9' } })
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('export-error').textContent).toContain('PDF 共 2 页'), {
      timeout: 10000,
    })
  })

  it('中文插入文字给出中文错误', async () => {
    render(<Tool />)
    selectFile(await makePdfFile())
    fireEvent.change(byTestId('input'), { target: { value: '中文' } })
    fireEvent.change(byTestId('input-page'), { target: { value: '1' } })
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(
      () => expect(byTestId('export-error').textContent).toContain('暂不支持中文字符'),
      { timeout: 10000 },
    )
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-page') as HTMLTextAreaElement).value).toBe('')
  })
})
