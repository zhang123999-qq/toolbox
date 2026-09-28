// @vitest-environment jsdom
/**
 * svg-game 组件测试（#795）：SVG 游戏资源。
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

describe('svg-game · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['svggame-template', 'svggame-primary', 'svggame-secondary', 'svggame-preview', 'svggame-copy', 'svggame-download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('初始预览为史莱姆', () => {
    render(<Tool />)
    expect(byTestId('svggame-output').textContent).toContain('<svg')
    expect((byTestId('svggame-template') as HTMLSelectElement).value).toBe('slime')
  })

  it('切换模板更新预览与默认配色', () => {
    render(<Tool />)
    fireEvent.change(byTestId('svggame-template'), { target: { value: 'coin' } })
    expect(byTestId('svggame-output').textContent).toContain('#fbbf24')
    expect((byTestId('svggame-primary') as HTMLInputElement).value).toBe('#fbbf24')
  })

  it('修改主色更新输出', () => {
    render(<Tool />)
    fireEvent.change(byTestId('svggame-primary'), { target: { value: '#123456' } })
    expect(byTestId('svggame-output').textContent).toContain('#123456')
  })

  it('复制按钮调用剪贴板', () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<Tool />)
    fireEvent.click(byTestId('svggame-copy'))
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(String(writeText.mock.calls[0][0])).toContain('<svg')
  })

  it('下载按钮创建链接并点击', () => {
    const click = vi.fn()
    const originalCreate = document.createElement.bind(document)
    const create = vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
      if (tag === 'a') return { click, set href(_v: string) {}, set download(_v: string) {} } as unknown as HTMLElement
      return originalCreate(tag)
    }) as typeof document.createElement)
    const objUrl = vi.fn(() => 'blob:mock')
    const revoke = vi.fn()
    vi.stubGlobal('URL', { createObjectURL: objUrl, revokeObjectURL: revoke })
    render(<Tool />)
    fireEvent.click(byTestId('svggame-download'))
    expect(objUrl).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(revoke).toHaveBeenCalledTimes(1)
    create.mockRestore()
  })
})
