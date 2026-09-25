// @vitest-environment jsdom
/**
 * jwt-generate 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

const KNOWN_HS256 =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IuW3peWFt-W6kyBUb29sYm94Iiwicm9sZSI6ImFkbWluIn0.ZBhZL0i-YX8INfmGx5HLpPl62RGIhBfCkhK-ymqzmuA'

describe('jwt-generate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('密钥有附加输入框', () => {
    render(<Tool />)
    expect(byTestId('input-secret')).toBeTruthy()
  })

  it('示例 → 运行 → 输出已知令牌', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe(KNOWN_HS256), { timeout: 10000 })
  })

  it('切到 HS512 后签名段变长', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe(KNOWN_HS256), { timeout: 10000 })
    fireEvent.change(screen.getByLabelText('算法'), { target: { value: 'HS512' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output().split('.')[2]?.length).toBe(86), { timeout: 10000 })
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

  it('payload 不是 JSON 对象时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[1,2,3]' } })
    fireEvent.change(byTestId('input-secret'), { target: { value: 'demo-secret-1234567890-demo' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'), {
      timeout: 10000,
    })
  })
})
