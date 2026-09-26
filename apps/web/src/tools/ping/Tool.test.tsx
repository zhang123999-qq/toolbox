// @vitest-environment jsdom
/**
 * ping 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('ping · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行后输出 ping 命令与浏览器边界说明', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      const output = byTestId('output').textContent ?? ''
      expect(output).toContain('ping -n 4 -l 64 example.com')
      expect(output).toContain('浏览器无法发送真实 ICMP')
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

  it('切到 linux 平台后命令换成 -c/-i/-s', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('平台'), { target: { value: 'linux' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('ping -c 4 -i 1 -s 64 example.com')
    })
  })

  it('修改发包数后命令同步更新', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('发包数'), { target: { value: '10' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('ping -n 10 -l 64 example.com')
    })
  })

  it('非法目标时运行后输出区转为 role=alert', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'bad host' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').getAttribute('role')).toBe('alert')
    })
  })
})
