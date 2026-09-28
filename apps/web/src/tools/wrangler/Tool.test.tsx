// @vitest-environment jsdom
/**
 * wrangler 组件测试（#810）：命令拼装展示与错误提示。
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

describe('wrangler · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('默认拼装 kv-put 命令', () => {
    render(<Tool />)
    expect(byTestId('wrangler-command').textContent).toBe(
      'npx wrangler kv:key put --binding=MY_KV hello world',
    )
  })

  it('切换到 deploy 显示对应命令', () => {
    render(<Tool />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'deploy' } })
    expect(byTestId('wrangler-command').textContent).toBe('npx wrangler deploy')
    expect(byTestId('wrangler-desc').textContent).toContain('发布到 Cloudflare')
  })

  it('缺必填参数显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'binding=MY_KV' } })
    expect(byTestId('wrangler-error').textContent).toContain('缺少必填参数：key')
  })

  it('参数格式非法显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'badline' } })
    expect(byTestId('wrangler-error').textContent).toContain('第 1 行参数格式非法')
  })

  it('速查列表展示全部命令', () => {
    render(<Tool />)
    expect(screen.getByText(/全部 7 条常用命令速查/)).toBeTruthy()
  })
})
