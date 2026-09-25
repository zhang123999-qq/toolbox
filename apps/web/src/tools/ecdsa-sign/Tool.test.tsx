// @vitest-environment jsdom
/**
 * ecdsa-sign 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('ecdsa-sign · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('私钥 / 公钥 / 签名各有附加输入框', () => {
    render(<Tool />)
    expect(byTestId('input-privateKey')).toBeTruthy()
    expect(byTestId('input-publicKey')).toBeTruthy()
    expect(byTestId('input-signature')).toBeTruthy()
  })

  it('示例 → 运行 → 产出 64 字节签名的 Base64', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^[A-Za-z0-9+/]{86}==$/), { timeout: 10000 })
  })

  it('签名后切到验签并填回签名 → 验签通过', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toMatch(/^[A-Za-z0-9+/]+=*$/), { timeout: 10000 })
    const signature = output()

    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'verify' } })
    fireEvent.change(byTestId('input-signature'), { target: { value: signature } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('验签通过'), { timeout: 10000 })
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

  it('签名方向缺少私钥时进入错误态（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'hello' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'), {
      timeout: 10000,
    })
  })
})
