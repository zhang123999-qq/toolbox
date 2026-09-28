// @vitest-environment jsdom
/**
 * serial-test 组件测试（#870）：navigator.serial 全 mock。
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

function stubSerial(serial: unknown): void {
  Object.defineProperty(window.navigator, 'serial', {
    value: serial,
    configurable: true,
  })
}

describe('serial-test · Tool', () => {
  it('请求串口成功后展示端口信息', async () => {
    stubSerial({
      requestPort: vi.fn(async () => ({
        getInfo: () => ({ usbVendorId: 0x2341, usbProductId: 0x0043 }),
        open: vi.fn(async () => {}),
        close: vi.fn(async () => {}),
      })),
    })
    render(<Tool />)
    fireEvent.click(byTestId('serial-connect'))
    await waitFor(() => {
      expect(byTestId('serial-info').textContent).toContain('串口 #1')
      expect(byTestId('serial-info').textContent).toContain('0x2341:0x0043')
    })
  })

  it('请求失败时展示错误', async () => {
    stubSerial({
      requestPort: vi.fn(async () => {
        throw new Error('No port selected')
      }),
    })
    render(<Tool />)
    fireEvent.click(byTestId('serial-connect'))
    await waitFor(() => {
      expect(byTestId('serial-error').textContent).toContain('No port selected')
    })
  })

  it('空授权列表展示提示', async () => {
    stubSerial({ getPorts: vi.fn(async () => []) })
    render(<Tool />)
    fireEvent.click(byTestId('serial-list'))
    await waitFor(() => {
      expect(byTestId('serial-info').textContent).toContain('暂无已授权')
    })
  })

  it('选择串口后可打开/关闭', async () => {
    const close = vi.fn(async () => {})
    const open = vi.fn(async () => {})
    stubSerial({
      requestPort: vi.fn(async () => ({
        getInfo: () => ({}),
        open,
        close,
      })),
    })
    render(<Tool />)
    fireEvent.click(byTestId('serial-connect'))
    await waitFor(() => {
      expect(byTestId('serial-open')).toBeTruthy()
    })
    fireEvent.change(byTestId('serial-baudrate'), { target: { value: '115200' } })
    fireEvent.click(byTestId('serial-open'))
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith({ baudRate: 115200 })
    })
    fireEvent.click(byTestId('serial-close'))
    await waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1)
    })
  })

  it('API 缺失时展示中文提示', async () => {
    stubSerial(undefined)
    render(<Tool />)
    fireEvent.click(byTestId('serial-connect'))
    await waitFor(() => {
      expect(byTestId('serial-error').textContent).toContain('不支持 Web Serial')
    })
  })
})
