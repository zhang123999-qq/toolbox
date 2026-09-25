// @vitest-environment jsdom
/**
 * sha1-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('sha1-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后填入正文，但不自动运行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('abc')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点运行后得到 SHA-1 摘要', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe('a9993e364706816aba3e25717850c26c9cd0d89d'),
    )
  })

  it('勾上「大写输出」后结果全大写', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByLabelText('大写输出'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      const out = byTestId('output').textContent ?? ''
      expect(out).toBe('A9993E364706816ABA3E25717850C26C9CD0D89D')
    })
  })

  it('切到 Base64 格式后输出 Base64', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toBe('qZk+NkcGgWq6PiVxeFDCbJzQ2J0='))
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
