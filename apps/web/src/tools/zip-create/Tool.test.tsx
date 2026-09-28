// @vitest-environment jsdom
/**
 * zip-create 组件测试
 *
 * fflate 的 zipSync 是纯 JS，可在 jsdom 里真实打包；
 * 下载走的 URL.createObjectURL 在 jsdom 里不存在，这里打桩。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

// jsdom 没有 URL.createObjectURL：用普通函数打桩（不用 vi.fn，避免 restoreMocks 重置实现）
const createdUrls: string[] = []
const clicked: Array<{ url: string; filename: string }> = []

URL.createObjectURL = ((_blob: Blob) => {
  const url = 'blob:fake-' + createdUrls.length
  createdUrls.push(url)
  return url
}) as typeof URL.createObjectURL
URL.revokeObjectURL = ((_url: string) => {}) as typeof URL.revokeObjectURL
HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
  clicked.push({ url: this.href, filename: this.download })
}

beforeEach(() => {
  createdUrls.length = 0
  clicked.length = 0
})

function makeFile(name: string, content: string): File {
  return new File([new TextEncoder().encode(content)], name, { type: 'text/plain' })
}

describe('zip-create · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 打包 → 输出报告并触发下载', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('file-list').textContent).toContain('hello.txt')
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('打包成功'), {
      timeout: 10000,
    })
    expect(byTestId('output').textContent).toContain('archive.zip')
    expect(clicked.length).toBeGreaterThan(0)
    expect(clicked[0]?.filename).toBe('archive.zip')
  })

  it('压缩包文件名跟随输入框', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input'), { target: { value: '我的包' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('我的包.zip'), {
      timeout: 10000,
    })
    expect(clicked[clicked.length - 1]?.filename).toBe('我的包.zip')
  })

  it('切换压缩级别后打包仍成功', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-level'), { target: { value: '0' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('级别 0'), {
      timeout: 10000,
    })
  })

  it('直接上传文件也能打包', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeFile('a.txt', 'aaa')] } })
    expect(byTestId('file-list').textContent).toContain('a.txt')
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('打包成功'), {
      timeout: 10000,
    })
  })

  it('未选文件点打包 → 中文报错', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('至少一个文件'), {
      timeout: 10000,
    })
    expect(byTestId('output').querySelector('[role="alert"]')).toBeTruthy()
  })

  it('重新下载按钮在打包后可用', async () => {
    render(<Tool />)
    expect((byTestId('download') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('打包成功'), {
      timeout: 10000,
    })
    const before = clicked.length
    fireEvent.click(byTestId('download'))
    expect(clicked.length).toBe(before + 1)
  })

  it('清空后回到初始态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('打包成功'), {
      timeout: 10000,
    })
    fireEvent.click(byTestId('clear'))
    expect(byTestId('output').textContent).toContain('选择文件后点')
    expect((byTestId('input') as HTMLInputElement).value).toBe('archive')
  })
})
