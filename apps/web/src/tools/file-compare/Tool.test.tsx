// @vitest-environment jsdom
/**
 * file-compare 组件测试
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

function makeFile(name: string, content: string): File {
  return new File([new TextEncoder().encode(content)], name, { type: 'text/plain' })
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('file-compare · Tool', () => {
  it('渲染后 7 个必需 data-testid 与两个文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('file-a')).toBeTruthy()
    expect(byTestId('file-b')).toBeTruthy()
  })

  it('示例 → 对比 → 显示差异统计与高亮行', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('summary')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('summary').textContent).toContain('新增')
    expect(output()).toContain('port=9090')
    expect(output()).toContain('port=8080')
  })

  it('完全相同的文件 → 提示完全相同', async () => {
    render(<Tool />)
    const a = makeFile('a.txt', 'same\ncontent\n')
    const b = makeFile('b.txt', 'same\ncontent\n')
    fireEvent.change(byTestId('file-a'), { target: { files: [a] } })
    fireEvent.change(byTestId('file-b'), { target: { files: [b] } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('完全相同'), { timeout: 10000 })
  })

  it('只选一个文件 → 中文提示选两个', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file-a'), { target: { files: [makeFile('a.txt', 'x')] } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('请先选择两个要对比的文件'), { timeout: 10000 })
    expect(byTestId('output').querySelector('[role="alert"]')).toBeTruthy()
  })

  it('二进制文件 → 中文拦截', async () => {
    render(<Tool />)
    const bin = new File([new Uint8Array([1, 0, 2])], 'b.bin')
    fireEvent.change(byTestId('file-a'), { target: { files: [bin] } })
    fireEvent.change(byTestId('file-b'), { target: { files: [makeFile('b.txt', 'x')] } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('二进制'), { timeout: 10000 })
  })

  it('切换字符粒度后仍能对比', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-mode'), { target: { value: 'char' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('summary')).toBeTruthy(), { timeout: 10000 })
  })

  it('下载按钮导出 .diff 文件', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('summary')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('download'))
    expect(clicked.map((c) => c.filename)).toContain('file-compare.diff')
  })

  it('清空后回到初始态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('summary')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('clear'))
    expect(output()).toContain('选择两个文件后点')
  })
})
