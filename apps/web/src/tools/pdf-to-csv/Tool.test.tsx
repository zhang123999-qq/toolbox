// @vitest-environment jsdom
/**
 * pdf-to-csv 组件测试：pdfjs-dist 整体 mock，验证文件入口的
 * 成功链路（含列识别与转义）与各错误分支。
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

function pdfFile(name = 'table.pdf'): File {
  return new File(['%PDF-1.4 fake'], name, { type: 'application/pdf' })
}

const textItem = (str: string, x: number, y: number) => ({
  str,
  transform: [12, 0, 0, 12, x, y],
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
        textItem('姓名', 72, 700),
        textItem('备注', 200, 700),
        textItem('张三', 72, 680),
        textItem('喜欢,逗号', 200, 680),
        textItem('李四', 72, 660),
        textItem('=SUM(A1)', 200, 660),
      ],
    ]),
  )
})

afterEach(cleanup)

describe('pdf-to-csv · Tool', () => {
  it('渲染后 8 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选择 PDF → 输出列对齐的 CSV，转义正确', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('姓名'), { timeout: 10000 })
    const lines = output().split('\r\n')
    expect(lines[0]).toBe('姓名,备注')
    // 含逗号的单元格加引号
    expect(lines[1]).toBe('张三,"喜欢,逗号"')
    // 公式注入防护
    expect(lines[2]).toBe("李四,'=SUM(A1)")
  })

  it('切换分号分隔符后转义跟随', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('列分隔符'), { target: { value: ';' } })
    fireEvent.change(byTestId('file'), { target: { files: [pdfFile()] } })
    await waitFor(() => expect(output()).toContain('姓名'), { timeout: 10000 })
    expect(output().split('\r\n')[0]).toBe('姓名;备注')
    // 逗号在分号模式下不再需要引号
    expect(output()).toContain('喜欢,逗号')
    expect(output()).not.toContain('"喜欢,逗号"')
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
})
