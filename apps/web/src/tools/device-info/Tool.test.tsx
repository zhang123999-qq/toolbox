// @vitest-environment jsdom
/**
 * device-info 组件测试（#860）：navigator 注入。
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

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

function stubNavigator(): void {
  Object.defineProperty(window, 'navigator', {
    value: {
      platform: 'iPhone',
      hardwareConcurrency: 6,
      deviceMemory: 4,
      userAgent: IPHONE_UA,
      language: 'zh-CN',
      maxTouchPoints: 5,
    },
    configurable: true,
  })
}

describe('device-info · Tool', () => {
  it('点击检测后展示设备类型与硬件信息', () => {
    stubNavigator()
    render(<Tool />)
    fireEvent.click(byTestId('device-refresh'))
    expect(byTestId('device-type').textContent).toContain('手机')
    expect(byTestId('device-platform').textContent).toContain('iPhone')
    expect(byTestId('device-cores').textContent).toContain('6')
    expect(byTestId('device-memory').textContent).toContain('4 GB')
    expect(byTestId('device-touch').textContent).toContain('是')
    expect(byTestId('device-language').textContent).toContain('zh-CN')
  })

  it('内存未知时显示"未知"', () => {
    Object.defineProperty(window, 'navigator', {
      value: { platform: 'Win32', userAgent: 'x', language: 'en-US' },
      configurable: true,
    })
    render(<Tool />)
    fireEvent.click(byTestId('device-refresh'))
    expect(byTestId('device-memory').textContent).toContain('未知')
    expect(byTestId('device-type').textContent).toContain('桌面')
  })
})
