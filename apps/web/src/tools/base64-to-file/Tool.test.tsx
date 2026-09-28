// @vitest-environment jsdom
/**
 * base64-to-file 组件测试
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

const clicked: Array<{ url: string; filename: string }> = []

URL.createObjectURL = ((_blob: Blob) => 'blob:fake') as typeof URL.createObjectURL
URL.revokeObjectURL = ((_url: string) => {}) as typeof URL.revokeObjectURL
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  clicked.push({ url: this.href, filename: this.download })
}

beforeEach(() => {
  clicked.length = 0
})

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('base64-to-file · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行 → 报告；下载保存为二进制文件', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('解码成功')
    expect(output()).toContain('decoded.bin')
    fireEvent.click(byTestId('download'))
    expect(clicked.map((c) => c.filename)).toContain('decoded.bin')
  })

  it('文件名与扩展名跟随选项', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-filename'), { target: { value: 'hi' } })
    fireEvent.change(byTestId('option-extension'), { target: { value: 'txt' } })
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('hi.txt')
    fireEvent.click(byTestId('download'))
    expect(clicked.map((c) => c.filename)).toContain('hi.txt')
  })

  it('data: URL 前缀自动决定扩展名', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'data:image/png;base64,aGVsbG8=' } })
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('decoded.png')
  })

  it('非法 Base64 → 中文报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not base64!!' } })
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('不是合法的 Base64')
    expect(byTestId('output').querySelector('[role="alert"]')).toBeTruthy()
  })

  it('空输入 → 中文提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('请先粘贴')
  })

  it('清空后回到初始态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('解码成功')
    fireEvent.click(byTestId('clear'))
    expect(output()).toContain('粘贴 Base64 后点')
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
