// @vitest-environment jsdom
/**
 * aes-encrypt 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('aes-encrypt · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('密钥与 IV 用附加输入框承载（input-key / input-iv）', () => {
    render(<Tool />)
    expect(byTestId('input-key')).toBeTruthy()
    expect(byTestId('input-iv')).toBeTruthy()
  })

  it('示例 → 运行 → 输出 `<iv>.<密文>` 形式（异步等待）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/))
  })

  it('示例 → 运行 → 切到解密方向能还原原文', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/\./))
    const cipher = output()

    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'decrypt' } })
    fireEvent.change(byTestId('input'), { target: { value: cipher } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe('这是一段需要加密的明文。'))
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

  it('CBC 模式缺少 IV 时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('算法模式'), { target: { value: 'CBC' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'))
  })

  it('密钥长度与位数不符时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('长度（bit）'), { target: { value: '256' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'))
  })
})
