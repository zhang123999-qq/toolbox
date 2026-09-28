// @vitest-environment jsdom
/**
 * pdf-extract 组件测试
 *
 * 覆盖：必需 testid、文件入口存在、上传（mock pdfjs）→ 按页提取文本、
 * 非 PDF 文件中文错误、空文件中文错误、清空。
 *
 * 注意：pdfjs-dist 在此 mock 掉，只验证「Tool.tsx 的文本项映射 + utils 组合」；
 * 文本项重组/合并的纯函数分支由 test.ts 全覆盖。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    promise: Promise.resolve({
      numPages: 2,
      getPage: async (n: number) => ({
        getTextContent: async () => ({
          items:
            n === 1
              ? [
                  { str: 'Hello', transform: [1, 0, 0, 1, 10, 700], hasEOL: false },
                  { str: 'World', transform: [1, 0, 0, 1, 60, 700], hasEOL: true },
                  { str: '', transform: [1, 0, 0, 1, 10, 690] }, // 空串丢弃
                  { str: 123, transform: [1, 0, 0, 1, 10, 680] }, // 非字符串丢弃
                  { str: 'NoTransform' }, // transform 缺失 → x/y 取 0
                  { str: 'BadX', transform: [1, 0, 0, 1, 'x', null] }, // 非数字坐标 → 0
                ]
              : [{ str: 'Second', transform: [1, 0, 0, 1, 10, 700] }],
        }),
      }),
    }),
  }),
}))

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

/** 触发文件选择：jsdom 的 input.files 需用 defineProperty 注入 */
function selectFile(name: string, type: string, content: string): void {
  const file = new File([content], name, { type })
  const input = byTestId('file') as HTMLInputElement
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  fireEvent.change(input)
}

describe('pdf-extract · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('file')).toBeTruthy()
  })

  it('上传 PDF → 按页提取文本', async () => {
    render(<Tool />)
    selectFile('demo.pdf', 'application/pdf', '%PDF-1.4 fake')
    await waitFor(() => expect(output()).toContain('--- 第 1 页 ---'), { timeout: 10000 })
    expect(output()).toContain('Hello World')
    expect(output()).toContain('--- 第 2 页 ---')
    expect(output()).toContain('Second')
  })

  it('非 PDF 文件给出中文错误', async () => {
    render(<Tool />)
    selectFile('demo.txt', 'text/plain', 'hello')
    await waitFor(() => expect(output()).toContain('请选择 PDF 文件'), { timeout: 10000 })
  })

  it('空文件给出中文错误', async () => {
    render(<Tool />)
    selectFile('empty.pdf', 'application/pdf', '')
    await waitFor(() => expect(output()).toContain('文件为空'), { timeout: 10000 })
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
