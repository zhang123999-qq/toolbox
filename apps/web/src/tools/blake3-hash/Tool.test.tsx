// @vitest-environment jsdom
/**
 * blake3-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * blake3-wasm 在 jsdom 里可以从 node_modules 直接实例化（不依赖 fetch 相对路径），
 * 因此这里跑的是真实实现，不是桩件。
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

describe('blake3-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行 → 输出 32 字节摘要', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(
      () =>
        expect(output()).toBe('ea8f163db38682925e4491c5e58d4bb3506ef8c14eb78a86e908c5624a67200f'),
      { timeout: 20000 },
    )
  })

  it('切到 64 字节后输出 128 个十六进制字符', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output().length).toBe(64), { timeout: 20000 })
    fireEvent.change(screen.getByLabelText('长度'), { target: { value: '64' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output().length).toBe(128), { timeout: 20000 })
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
