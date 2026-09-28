// @vitest-environment jsdom
/**
 * usb-test 组件测试（#869）：navigator.usb 全 mock。
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

function stubUSB(usb: unknown): void {
  Object.defineProperty(window.navigator, 'usb', {
    value: usb,
    configurable: true,
  })
}

describe('usb-test · Tool', () => {
  it('请求成功后展示设备名与 ID', async () => {
    stubUSB({
      requestDevice: vi.fn(async () => ({
        vendorId: 0x2341,
        productId: 0x0043,
        productName: 'Arduino Uno',
      })),
    })
    render(<Tool />)
    fireEvent.click(byTestId('usb-connect'))
    await waitFor(() => {
      const text = byTestId('usb-devices').textContent ?? ''
      expect(text).toContain('Arduino Uno')
      expect(text).toContain('0x2341:0x0043')
    })
  })

  it('请求被取消时展示错误', async () => {
    stubUSB({
      requestDevice: vi.fn(async () => {
        throw new Error('No device selected')
      }),
    })
    render(<Tool />)
    fireEvent.click(byTestId('usb-connect'))
    await waitFor(() => {
      expect(byTestId('usb-error').textContent).toContain('No device selected')
    })
  })

  it('列出已授权设备', async () => {
    stubUSB({
      getDevices: vi.fn(async () => [
        { vendorId: 0x05ac, productId: 0x1234, productName: 'USB 设备' },
      ]),
    })
    render(<Tool />)
    fireEvent.click(byTestId('usb-list'))
    await waitFor(() => {
      const text = byTestId('usb-devices').textContent ?? ''
      expect(text).toContain('USB 设备')
      expect(text).toContain('0x05AC:0x1234')
    })
  })

  it('空授权列表展示提示', async () => {
    stubUSB({ getDevices: vi.fn(async () => []) })
    render(<Tool />)
    fireEvent.click(byTestId('usb-list'))
    await waitFor(() => {
      expect(byTestId('usb-hint').textContent).toContain('暂无已授权')
    })
  })

  it('API 缺失时展示中文提示', async () => {
    stubUSB(undefined)
    render(<Tool />)
    fireEvent.click(byTestId('usb-connect'))
    await waitFor(() => {
      expect(byTestId('usb-error').textContent).toContain('不支持 WebUSB')
    })
  })
})
