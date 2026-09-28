// @vitest-environment jsdom
/**
 * gif-to-sprite 组件测试（#798）：GIF 转精灵图。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('gif-to-sprite · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['giftosprite-file', 'giftosprite-cols', 'giftosprite-layout', 'giftosprite-export', 'giftosprite-canvas']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('未解码时布局与导出按钮禁用', () => {
    render(<Tool />)
    expect((byTestId('giftosprite-layout') as HTMLButtonElement).disabled).toBe(true)
    expect((byTestId('giftosprite-export') as HTMLButtonElement).disabled).toBe(true)
    expect(byTestId('giftosprite-output').textContent).toContain('请选择 GIF 文件')
  })

  it('列数输入可修改', () => {
    render(<Tool />)
    fireEvent.change(byTestId('giftosprite-cols'), { target: { value: '2' } })
    expect((byTestId('giftosprite-cols') as HTMLInputElement).value).toBe('2')
  })
})
