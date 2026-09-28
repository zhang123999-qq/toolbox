// @vitest-environment jsdom
/**
 * extension-pack 组件测试（#775）：扩展打包与下载。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('extension-pack · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('extensionpack-run')).toBeTruthy()
  })

  it('示例清单打包成功并给出下载链接', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-zip')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    render(<Tool />)
    fireEvent.click(byTestId('extensionpack-run'))
    expect(byTestId('extensionpack-output').textContent).toContain('已打包 2 个文件')
    expect(createObjectURL).toHaveBeenCalled()
    const link = byTestId('extensionpack-download') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-zip')
    expect(link.getAttribute('download')).toBe('extension.zip')
  })

  it('缺少 manifest.json 报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"files":[{"name":"a.js","content":"x"}]}' },
    })
    fireEvent.click(byTestId('extensionpack-run'))
    expect(byTestId('extensionpack-error').textContent).toContain('必须包含 manifest.json')
  })

  it('非法文件名报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          '{"files":[{"name":"manifest.json","content":"{}"},{"name":"../evil.js","content":"x"}]}',
      },
    })
    fireEvent.click(byTestId('extensionpack-run'))
    expect(byTestId('extensionpack-error').textContent).toContain('非法文件名')
  })

  it('非法 JSON 报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{' } })
    fireEvent.click(byTestId('extensionpack-run'))
    expect(byTestId('extensionpack-error').textContent).toContain('不是合法 JSON')
  })
})
