// @vitest-environment jsdom
/**
 * pdf-to-markdown 组件测试：pdfjs-dist 整体 mock，验证文件入口的
 * 成功链路与各错误分支（加密 / 超页 / 无文本 / 非 PDF / 损坏）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mockGetDocument = vi.fn()

vi.mock('pdfjs-dist', () => ({
  getDocument: (...args: unknown[]) => mockGetDocument(...args),
  GlobalWorkerOptions: {},
}))

import Tool from './Tool'

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

function pdfFile(name = 'doc.pdf'): File {
  return new File(['%PDF-1.4 fake'], name, { type: 'application/pdf' })
}

const textItem = (str: string, x: number, y: number, size = 12) => ({
  str,
  transform: [size, 0, 0, size, x, y],
  hasEOL: false,
})

/** 构造假文档：每页给一组文本项 */
function fakeDoc(pages: Array<Array<ReturnType<typeof textItem>>>) {
  return {
    promise: Promise.resolve({
      numPages: pages.length,
      getPage: async (n: number) => ({
        getTextContent: async () => ({ items: pages[n - 1] ?? [] }),
      }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetDocument.mockReturnValue(
    fakeDoc([
      [
        textItem('年度报告', 72, 720, 20),
        textItem('这是正文第一段。', 72, 700),
        textItem('• 重点一', 72, 680),
        textItem('• 重点二', 72, 664),
      ],
    ]),
  )
})

afterEach(cleanup)

describe('pdf-to-markdown · Tool', () => {
  it('渲染后 8 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选择 PDF → 输出标题、段落与列表的 Markdown', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('# 年度报告'), { timeout: 10000 })
    expect(output()).toContain('这是正文第一段。')
    expect(output()).toContain('- 重点一\n- 重点二')
    expect(byTestId('file-name').textContent).toContain('doc.pdf')
  })

  it('关闭标题识别后大字号行不再加 #', async () => {
    render(<Tool />)
    const checkbox = screen.getByLabelText('按字号识别标题') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('年度报告'), { timeout: 10000 })
    expect(output()).not.toContain('# 年度报告')
  })

  it('非 PDF 文件中文报错', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), {
      target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    })
    await waitFor(() => expect(output()).toContain('请选择 PDF 文件'), { timeout: 10000 })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('加密 PDF 中文提示去密码', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.reject({ name: 'PasswordException', message: 'need password' }),
    })
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('已加密'), { timeout: 10000 })
  })

  it('损坏文件中文提示', async () => {
    mockGetDocument.mockReturnValue({ promise: Promise.reject(new Error('Invalid PDF')) })
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('损坏'), { timeout: 10000 })
  })

  it('超过 50 页拒绝', async () => {
    mockGetDocument.mockReturnValue(fakeDoc(Array.from({ length: 51 }, () => [])))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('50 页上限'), { timeout: 10000 })
  })

  it('全页无文本 → 建议用 #500 OCR', async () => {
    mockGetDocument.mockReturnValue(fakeDoc([[]]))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('#500'), { timeout: 10000 })
  })

  it('部分空页 → 占位提示但不整体失败', async () => {
    mockGetDocument.mockReturnValue(fakeDoc([[], [textItem('有字', 72, 700)]]))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('第 1 页无文本'), { timeout: 10000 })
    expect(output()).toContain('有字')
  })
})
