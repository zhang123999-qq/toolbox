// @vitest-environment jsdom
/**
 * file-split 组件测试
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

describe('file-split · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例（4B 切分）→ 4 个分片', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('4 个分片'), { timeout: 10000 })
    expect(byTestId('part-list').textContent).toContain('demo.part1.bin')
  })

  it('按数量切分', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-mode'), { target: { value: 'count' } })
    fireEvent.change(byTestId('input'), { target: { value: '5' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('5 个分片'), { timeout: 10000 })
  })

  it('非法参数 → 中文报错', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input'), { target: { value: 'zzz' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('格式不正确'), { timeout: 10000 })
    expect(byTestId('output').querySelector('[role="alert"]')).toBeTruthy()
  })

  it('未选文件 → 中文提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('请先选择要切分的文件'), { timeout: 10000 })
  })

  it('单分片下载与全部下载', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('part-list')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId('download-part-demo.part1.bin'))
    expect(clicked.map((c) => c.filename)).toContain('demo.part1.bin')
    const before = clicked.length
    fireEvent.click(byTestId('download-all'))
    expect(clicked.length).toBe(before + 4)
  })

  it('清空后回到初始态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('个分片'), { timeout: 10000 })
    fireEvent.click(byTestId('clear'))
    expect(output()).toContain('选择文件、填好切分参数')
  })
})
