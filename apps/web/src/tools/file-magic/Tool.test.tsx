// @vitest-environment jsdom
/**
 * file-magic 组件测试
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

describe('file-magic · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('未选文件时运行按钮禁用', () => {
    render(<Tool />)
    expect((byTestId('run') as HTMLButtonElement).disabled).toBe(true)
  })

  it('示例（PNG 头）→ 鉴定出 PNG 并判疑似篡改', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    await waitFor(() => expect(output()).toContain('PNG 图片'), { timeout: 10000 })
    expect(output()).toContain('疑似篡改')
  })

  it('选真实 png 文件 → 未发现篡改', async () => {
    render(<Tool />)
    const f = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], 'a.png')
    fireEvent.change(byTestId('file'), { target: { files: [f] } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('未发现篡改迹象'), { timeout: 10000 })
  })

  it('下载保存鉴定报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    await waitFor(() => expect(output()).toContain('PNG 图片'), { timeout: 10000 })
    fireEvent.click(byTestId('download'))
    expect(clicked.map((c) => c.filename)).toContain('file-magic.txt')
  })

  it('清空后回到初始态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    await waitFor(() => expect(output()).toContain('PNG 图片'), { timeout: 10000 })
    fireEvent.click(byTestId('clear'))
    expect(output()).toContain('选择文件后点')
  })
})
