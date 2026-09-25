// @vitest-environment jsdom
/**
 * xxhash-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * xxhash-wasm 在 jsdom 里可直接实例化（WASM 内联在包里，不走 fetch），
 * 因此这里跑的是真实实现。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

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

describe('xxhash-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行 → 输出 xxHash32', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe('fb0077f9'), { timeout: 20000 })
  })

  it('切到 64 位后输出 16 位十六进制', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe('fb0077f9'), { timeout: 20000 })
    fireEvent.change(screen.getByLabelText('长度（bit）'), { target: { value: '64' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe('26c7827d889f6da3'), { timeout: 20000 })
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
