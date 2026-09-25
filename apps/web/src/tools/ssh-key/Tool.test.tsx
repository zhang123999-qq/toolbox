// @vitest-environment jsdom
/**
 * ssh-key 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 注意：这是异步工具，点「运行」才调用 WebCrypto；「示例」只填输入框。
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

describe('ssh-key · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后填入注释，但不自动生成密钥', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('generate')
    expect(byTestId('output').textContent).not.toContain('ssh-ed25519')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点「运行」后得到 OpenSSH 公钥与 PKCS#8 私钥', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(
      () => {
        expect(byTestId('output').textContent).toContain('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5')
      },
      { timeout: 15000 },
    )
    expect(byTestId('output').textContent).toContain('-----BEGIN PRIVATE KEY-----')
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

  it('切到 RSA 后公钥前缀随之变化', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('算法'), { target: { value: 'rsa' } })
    fireEvent.click(byTestId('run'))
    await waitFor(
      () => {
        expect(byTestId('output').textContent).toContain('ssh-rsa AAAAB3NzaC1yc2E')
      },
      { timeout: 30000 },
    )
  })

  it('注释含空白字符时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'bad comment' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').getAttribute('role')).toBe('alert')
    })
  })
})
