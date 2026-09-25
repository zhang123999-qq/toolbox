// @vitest-environment jsdom
/**
 * ecc-encrypt 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

/** 演示密钥对协商出的共享密钥 */
const KNOWN_SECRET = 'koUH48K8QJoy6DOIyAFXfpChmIlyRbKhtSbrn03LfL8='

describe('ecc-encrypt · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('双方密钥各有附加输入框', () => {
    render(<Tool />)
    expect(byTestId('input-privateKey')).toBeTruthy()
    expect(byTestId('input-publicKey')).toBeTruthy()
  })

  it('示例 → 运行 → 输出已知共享密钥', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe(KNOWN_SECRET), { timeout: 10000 })
  })

  it('切到 hex 编码后输出同一字节的十六进制', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toBe(KNOWN_SECRET), { timeout: 10000 })
    fireEvent.change(screen.getByLabelText('编码'), { target: { value: 'hex' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(output()).toBe('928507e3c2bc409a32e83388c801577e90a198897245b2a1b526eb9f4dcb7cbf'),
    )
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

  it('协商但缺少密钥时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'derive' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'), {
      timeout: 10000,
    })
  })
})
