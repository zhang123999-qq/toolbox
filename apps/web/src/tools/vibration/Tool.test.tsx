// @vitest-environment jsdom
/**
 * vibration 组件测试（#866）：navigator.vibrate 全 mock。
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

function stubVibrate(ok: boolean, ret = true): void {
  Object.defineProperty(window.navigator, 'vibrate', {
    value: ok ? vi.fn(() => ret) : undefined,
    configurable: true,
  })
}

describe('vibration · Tool', () => {
  it('触发成功后展示模式描述', () => {
    stubVibrate(true)
    render(<Tool />)
    fireEvent.click(byTestId('vibration-sos'))
    expect(byTestId('vibration-result').textContent).toContain('已触发：SOS')
    expect(byTestId('vibration-result').textContent).toContain('震动序列')
  })

  it('浏览器返回 false 时展示拒绝提示', () => {
    stubVibrate(true, false)
    render(<Tool />)
    fireEvent.click(byTestId('vibration-short'))
    expect(byTestId('vibration-result').textContent).toContain('拒绝了震动请求')
  })

  it('API 缺失时展示中文提示', () => {
    stubVibrate(false)
    render(<Tool />)
    fireEvent.click(byTestId('vibration-long'))
    expect(byTestId('vibration-error').textContent).toContain('不支持 Vibration API')
  })
})
