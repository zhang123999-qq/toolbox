// @vitest-environment jsdom
/**
 * cloudflare 组件测试（#813）：两种生成模式与错误提示。
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

describe('cloudflare · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('默认生成 DNS 记录 JSON', () => {
    render(<Tool />)
    const text = byTestId('cloudflare-result').textContent ?? ''
    expect(text).toContain('"type": "A"')
    expect(text).toContain('"content": "203.0.113.10"')
  })

  it('切换到页面规则模式', () => {
    render(<Tool />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'page-rule' } })
    fireEvent.change(byTestId('input'), {
      target: { value: 'pattern=example.com/*\ncacheLevel=basic\nbrowserTtl=60' },
    })
    expect(byTestId('cloudflare-result').textContent).toContain('browser_cache_ttl')
  })

  it('非法记录类型显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'type=MX\nname=@\ncontent=x' } })
    expect(byTestId('cloudflare-error').textContent).toContain('不支持的记录类型')
  })

  it('非法 TTL 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'type=A\nname=www\ncontent=1.2.3.4\nttl=5' },
    })
    expect(byTestId('cloudflare-error').textContent).toContain('TTL 须为 1（自动）或 ≥30 的整数秒')
  })
})
