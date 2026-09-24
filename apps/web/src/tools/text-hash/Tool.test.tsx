// @vitest-environment jsdom
/**
 * text-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('text-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后填入正文，但不自动发请求', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).not.toBe('')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点运行后得到 SHA-256 摘要', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    )
  })

  it('勾上大写后输出全大写', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      const out = byTestId('output').textContent ?? ''
      expect(out).toBe(out.toUpperCase())
      expect(out).toHaveLength(64)
    })
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
