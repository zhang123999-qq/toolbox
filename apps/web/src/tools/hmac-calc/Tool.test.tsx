// @vitest-environment jsdom
/**
 * hmac-calc 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('hmac-calc · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('密钥输入框（行数 1）存在且是独立字段', () => {
    render(<Tool />)
    const key = byTestId('input-key') as HTMLTextAreaElement
    expect(key).toBeTruthy()
    fireEvent.change(key, { target: { value: 'secret' } })
    expect(key.value).toBe('secret')
  })

  it('点击「示例」后同时填入消息与密钥，但不自动运行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(
      'The quick brown fox jumps over the lazy dog',
    )
    expect((byTestId('input-key') as HTMLTextAreaElement).value).toBe('key')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点运行后得到标准 HMAC-SHA256 向量', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe(
        'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
      ),
    )
  })

  it('把密钥改成十六进制 "6b6579" 后仍得到同一结果', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('类型'), { target: { value: 'hex' } })
    fireEvent.change(byTestId('input-key'), { target: { value: '6b6579' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe(
        'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8',
      ),
    )
  })

  it('没填密钥就运行会进入错误态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input-key'), { target: { value: '' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'))
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-key') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
