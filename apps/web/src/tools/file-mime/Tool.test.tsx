// @vitest-environment jsdom
/**
 * file-mime 组件测试
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('file-mime · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行 → 输出 MIME 映射', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('.png → image/png')
  })

  it('选文件后「查询所选文件」校对文件头', async () => {
    render(<Tool />)
    const f = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'a.png',
      { type: 'image/png' },
    )
    fireEvent.change(byTestId('file'), { target: { files: [f] } })
    fireEvent.click(byTestId('run-file'))
    await waitFor(() => expect(output()).toContain('一致'), { timeout: 10000 })
  })

  it('未选文件点查询 → 中文提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run-file'))
    await waitFor(() => expect(output()).toContain('请先选择要查询的文件'), { timeout: 10000 })
  })

  it('未收录扩展名 → 中文报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xyz123' } })
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('未收录')
    expect(byTestId('output').querySelector('[role="alert"]')).toBeTruthy()
  })

  it('下载保存报告文本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    fireEvent.click(byTestId('download'))
    expect(clicked.map((c) => c.filename)).toContain('mime-lookup.txt')
  })

  it('清空后回到初始态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('image/png')
    fireEvent.click(byTestId('clear'))
    expect(output()).toContain('输入扩展名点')
  })
})
