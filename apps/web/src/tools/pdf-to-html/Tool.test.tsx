// @vitest-environment jsdom
/**
 * pdf-to-html 组件测试：pdfjs-dist 整体 mock，验证文件入口、
 * 预览/源码切换与各错误分支。
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

function pdfFile(name = 'doc.pdf'): File {
  return new File(['%PDF-1.4 fake'], name, { type: 'application/pdf' })
}

const textItem = (str: string, x: number, y: number, size = 12) => ({
  str,
  transform: [size, 0, 0, size, x, y],
  hasEOL: false,
})

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
        textItem('a<b>特殊&字符', 72, 700),
        textItem('• 重点一', 72, 680),
        textItem('• 重点二', 72, 664),
        textItem('1. 第一步', 72, 644),
      ],
    ]),
  )
})

afterEach(cleanup)

describe('pdf-to-html · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选择 PDF → 预览区渲染结构化 HTML', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('html-preview')).toBeTruthy(), { timeout: 10000 })
    const preview = byTestId('html-preview')
    expect(preview.innerHTML).toContain('<h1>年度报告</h1>')
    expect(preview.innerHTML).toContain('<ul>')
    expect(preview.innerHTML).toContain('<li>重点一</li>')
    expect(preview.innerHTML).toContain('<ol>')
    // 特殊字符被转义而非解析为标签
    expect(preview.innerHTML).toContain('a&lt;b&gt;特殊&amp;字符')
    expect(preview.querySelector('b')).toBeNull()
  })

  it('切换到源码 tab 显示转义后的 HTML 源码', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('tab-source')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('tab-source'))
    // pre 的 textContent 是解码后的原文（非转义形态）
    expect(byTestId('html-source').textContent).toContain('<h1>年度报告</h1>')
    expect(byTestId('html-source').textContent).toContain('<ul>')
    fireEvent.click(byTestId('tab-preview'))
    expect(byTestId('html-preview')).toBeTruthy()
  })

  it('非 PDF 文件中文报错', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), {
      target: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    })
    await waitFor(() => expect(byTestId('html-error').textContent).toContain('请选择 PDF 文件'), {
      timeout: 10000,
    })
    expect(mockGetDocument).not.toHaveBeenCalled()
  })

  it('加密 PDF 中文提示去密码', async () => {
    mockGetDocument.mockReturnValue({
      promise: Promise.reject({ name: 'PasswordException', message: 'need password' }),
    })
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('html-error').textContent).toContain('已加密'), {
      timeout: 10000,
    })
  })

  it('全页无文本 → 建议用 #500 OCR', async () => {
    mockGetDocument.mockReturnValue(fakeDoc([[]]))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('html-error').textContent).toContain('#500'), {
      timeout: 10000,
    })
  })

  it('超过 50 页拒绝', async () => {
    mockGetDocument.mockReturnValue(fakeDoc(Array.from({ length: 51 }, () => [])))
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(byTestId('html-error').textContent).toContain('50 页上限'), {
      timeout: 10000,
    })
  })
})
