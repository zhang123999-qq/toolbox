// @vitest-environment jsdom
/**
 * scrypt-derive 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('scrypt-derive · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('盐用附加输入框承载（input-salt）', () => {
    render(<Tool />)
    expect(byTestId('input-salt')).toBeTruthy()
  })

  it('示例 → 运行 → 得到 64 位十六进制派生结果', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^[0-9a-f]{64}$/), { timeout: 15000 })
  })

  it('切到 base64 格式后输出为 base64 字符集', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64' } })
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^[A-Za-z0-9+/]+=*$/), { timeout: 15000 })
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

  it('非法输入（超过上限）进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a'.repeat(200001) } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'), {
      timeout: 15000,
    })
  })
})
