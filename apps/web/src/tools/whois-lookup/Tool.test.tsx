// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = document.querySelector(`[data-testid="${id}"]`)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el as HTMLElement
}

// 组件测试不打真实网络：mock 掉 RDAP fetch，快速返回
beforeAll(() => {
  vi.stubGlobal('fetch', async () => ({
    ok: true,
    status: 200,
    json: async () => ({ registrar: { name: 'Test Registrar' }, events: [] }),
  }))
})

describe('whois-lookup · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行后输出注册域名', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('注册域名')
    })
  })

  it('非法域名进入错误态', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'nope' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').getAttribute('role')).toBe('alert')
    })
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
