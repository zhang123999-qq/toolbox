// @vitest-environment jsdom
/**
 * random-salt 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('random-salt · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后填入占位内容，但不自动生成', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('生成随机盐')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点运行后生成 16 字节（32 位 hex）的盐', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toMatch(/^[0-9a-f]{32}$/))
  })

  it('长度切到 64 字节后生成 128 位 hex', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('长度'), { target: { value: '64' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toMatch(/^[0-9a-f]{128}$/))
  })

  it('格式切到 base64url 后输出 URL-safe 字符集', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64url' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      const out = byTestId('output').textContent ?? ''
      expect(out).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(out).not.toMatch(/[+/=]/)
    })
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不生成也不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
