// @vitest-environment jsdom
/**
 * api-sign 组件测试（#757）：签名生成与验签（WebCrypto 为 jsdom 内置）。
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

describe('api-sign · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'apisign-method',
      'apisign-encoding',
      'apisign-path',
      'apisign-secret',
      'apisign-timestamp',
      'apisign-nonce',
      'apisign-template',
      'apisign-sign',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('无密钥时显示中文错误', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('apisign-sign'))
    expect((await screen.findByTestId('apisign-error')).textContent).toContain('请输入签名密钥')
  })

  it('固定参数生成确定性签名', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('apisign-secret'), { target: { value: 'test-secret' } })
    fireEvent.change(byTestId('apisign-timestamp'), { target: { value: '1700000000' } })
    fireEvent.change(byTestId('apisign-nonce'), { target: { value: 'abc123' } })
    fireEvent.change(byTestId('input'), {
      target: { value: '{"b":"2","a":"1"}' },
    })
    fireEvent.click(byTestId('apisign-sign'))
    const result = await screen.findByTestId('apisign-result')
    expect(result.textContent).toContain(
      '84d35472869ac4ba7a89a60007c4acb209c0d2579174e45d35433618588a5825',
    )
  })

  it('验签通过显示成功', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":"1"}' } })
    fireEvent.change(byTestId('apisign-secret'), { target: { value: 's3cr3t' } })
    fireEvent.change(byTestId('apisign-timestamp'), { target: { value: '1' } })
    fireEvent.change(byTestId('apisign-nonce'), { target: { value: 'n' } })
    fireEvent.click(byTestId('apisign-sign'))
    const result = await screen.findByTestId('apisign-result')
    const sig = result.textContent ?? ''
    const m = sig.match(/[0-9a-f]{64}/)
    expect(m).toBeTruthy()
    fireEvent.change(byTestId('apisign-verify-input'), { target: { value: m![0] } })
    fireEvent.click(byTestId('apisign-verify'))
    expect((await screen.findByTestId('apisign-verify-result')).textContent).toContain('验签通过')
  })

  it('错误签名验签失败', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":"1"}' } })
    fireEvent.change(byTestId('apisign-secret'), { target: { value: 's3cr3t' } })
    fireEvent.click(byTestId('apisign-sign'))
    await screen.findByTestId('apisign-result')
    fireEvent.change(byTestId('apisign-verify-input'), { target: { value: 'deadbeef' } })
    fireEvent.click(byTestId('apisign-verify'))
    expect((await screen.findByTestId('apisign-verify-result')).textContent).toContain('验签失败')
  })

  it('非法参数 JSON 显示中文错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('apisign-secret'), { target: { value: 's' } })
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    fireEvent.click(byTestId('apisign-sign'))
    expect((await screen.findByTestId('apisign-error')).textContent).toContain('不是合法 JSON')
  })
})
