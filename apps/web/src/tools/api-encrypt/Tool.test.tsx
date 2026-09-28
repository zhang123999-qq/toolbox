// @vitest-environment jsdom
/**
 * api-encrypt 组件测试（#758）：加密 / 解密往返（WebCrypto 为 jsdom 内置）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('api-encrypt · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['apiencrypt-mode', 'apiencrypt-password', 'apiencrypt-run']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('无密码时显示中文错误', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('apiencrypt-run'))
    expect((await screen.findByTestId('apiencrypt-error')).textContent).toContain('请输入密码')
  })

  it('加密输出 JSON 载荷', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('apiencrypt-password'), { target: { value: 'p@ss' } })
    fireEvent.change(byTestId('input'), { target: { value: 'hello' } })
    fireEvent.click(byTestId('apiencrypt-run'))
    const out = await screen.findByTestId('apiencrypt-output')
    const payload = JSON.parse(out.textContent ?? '')
    expect(payload.kdf).toBe('PBKDF2-SHA256')
    expect(payload.iter).toBe(100000)
    expect(payload.salt).toBeTruthy()
    expect(payload.iv).toBeTruthy()
    expect(payload.data).toBeTruthy()
  })

  it('加密后解密往返成功', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('apiencrypt-password'), { target: { value: 'p@ss' } })
    fireEvent.change(byTestId('input'), { target: { value: 'secret-data' } })
    fireEvent.click(byTestId('apiencrypt-run'))
    const out = await screen.findByTestId('apiencrypt-output')
    const payload = out.textContent ?? ''
    fireEvent.change(byTestId('apiencrypt-mode'), { target: { value: 'decrypt' } })
    fireEvent.change(byTestId('input'), { target: { value: payload } })
    fireEvent.click(byTestId('apiencrypt-run'))
    const dec = await screen.findByTestId('apiencrypt-output')
    expect(dec.textContent).toBe('secret-data')
  })

  it('密码错误显示中文报错', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('apiencrypt-password'), { target: { value: 'p@ss' } })
    fireEvent.change(byTestId('input'), { target: { value: 'hello' } })
    fireEvent.click(byTestId('apiencrypt-run'))
    const out = await screen.findByTestId('apiencrypt-output')
    const payload = out.textContent ?? ''
    fireEvent.change(byTestId('apiencrypt-password'), { target: { value: 'wrong' } })
    fireEvent.change(byTestId('apiencrypt-mode'), { target: { value: 'decrypt' } })
    fireEvent.change(byTestId('input'), { target: { value: payload } })
    fireEvent.click(byTestId('apiencrypt-run'))
    expect((await screen.findByTestId('apiencrypt-error')).textContent).toContain(
      '密码错误或数据已损坏',
    )
  })
})
