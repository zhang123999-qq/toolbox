// @vitest-environment jsdom
/**
 * battery 组件测试（#861）：navigator.getBattery 全 mock。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function stubBattery(opts?: { deny?: boolean }): void {
  Object.defineProperty(window.navigator, 'getBattery', {
    value: opts?.deny
      ? undefined
      : vi.fn().mockResolvedValue({
          level: 0.8,
          charging: true,
          chargingTime: 1800,
          dischargingTime: Infinity,
        }),
    configurable: true,
  })
}

describe('battery · Tool', () => {
  it('检测成功后展示电量状态与等级', async () => {
    stubBattery()
    render(<Tool />)
    fireEvent.click(byTestId('battery-refresh'))
    await waitFor(() => {
      expect(byTestId('battery-status').textContent).toContain('电量 80%')
    })
    expect(byTestId('battery-status').textContent).toContain('充电中')
    expect(byTestId('battery-level').textContent).toContain('充足')
    expect(byTestId('battery-charging').textContent).toContain('充电中')
  })

  it('无 API 时展示中文错误', async () => {
    stubBattery({ deny: true })
    render(<Tool />)
    fireEvent.click(byTestId('battery-refresh'))
    await waitFor(() => {
      expect(byTestId('battery-error').textContent).toContain('不支持 Battery Status API')
    })
    expect(screen.queryByTestId('battery-info')).toBeNull()
  })
})
