// @vitest-environment jsdom
/**
 * network-info 组件测试（#862）：navigator.connection 注入。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function stubNavigator(conn?: unknown): void {
  const nav: Record<string, unknown> = { onLine: true }
  if (conn !== undefined) nav['connection'] = conn
  Object.defineProperty(window, 'navigator', { value: nav, configurable: true })
}

describe('network-info · Tool', () => {
  it('完整 connection 时展示网络状况', () => {
    stubNavigator({ effectiveType: '4g', downlink: 10, rtt: 50, saveData: false })
    render(<Tool />)
    fireEvent.click(byTestId('network-refresh'))
    expect(byTestId('network-summary').textContent).toContain('网络在线')
    expect(byTestId('network-summary').textContent).toContain('4G')
    expect(byTestId('network-type').textContent).toContain('4G')
    expect(byTestId('network-downlink').textContent).toContain('10 Mbps')
    expect(byTestId('network-rtt').textContent).toContain('50 ms')
    expect(byTestId('network-savedata').textContent).toContain('未开启')
  })

  it('无 connection API 时字段显示未知', () => {
    stubNavigator()
    render(<Tool />)
    fireEvent.click(byTestId('network-refresh'))
    expect(byTestId('network-type').textContent).toContain('未知')
    expect(byTestId('network-downlink').textContent).toContain('未知')
    expect(byTestId('network-summary').textContent).toBe('网络在线')
  })
})
