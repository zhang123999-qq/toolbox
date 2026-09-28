// @vitest-environment jsdom
/**
 * bluetooth-test 组件测试（#868）：navigator.bluetooth 全 mock。
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

function stubBluetooth(bluetooth: unknown): void {
  Object.defineProperty(window.navigator, 'bluetooth', {
    value: bluetooth,
    configurable: true,
  })
}

describe('bluetooth-test · Tool', () => {
  it('连接成功后展示设备名', async () => {
    stubBluetooth({
      requestDevice: vi.fn(async () => ({ id: 'dev001', name: '蓝牙键盘' })),
    })
    render(<Tool />)
    fireEvent.click(byTestId('bluetooth-connect'))
    await waitFor(() => {
      expect(byTestId('bluetooth-devices').textContent).toContain('蓝牙键盘')
    })
  })

  it('连接被取消时展示错误', async () => {
    stubBluetooth({
      requestDevice: vi.fn(async () => {
        throw new Error('User cancelled')
      }),
    })
    render(<Tool />)
    fireEvent.click(byTestId('bluetooth-connect'))
    await waitFor(() => {
      expect(byTestId('bluetooth-error').textContent).toContain('User cancelled')
    })
  })

  it('列出已配对设备并展示未知设备兜底', async () => {
    stubBluetooth({
      getDevices: vi.fn(async () => [
        { id: 'a1', name: '手表' },
        { id: 'b2', name: null },
      ]),
    })
    render(<Tool />)
    fireEvent.click(byTestId('bluetooth-list'))
    await waitFor(() => {
      const text = byTestId('bluetooth-devices').textContent ?? ''
      expect(text).toContain('手表')
      expect(text).toContain('未知设备')
    })
  })

  it('空配对列表展示提示', async () => {
    stubBluetooth({ getDevices: vi.fn(async () => []) })
    render(<Tool />)
    fireEvent.click(byTestId('bluetooth-list'))
    await waitFor(() => {
      expect(byTestId('bluetooth-hint').textContent).toContain('暂无已配对')
    })
  })

  it('API 缺失时展示中文提示', async () => {
    stubBluetooth(undefined)
    render(<Tool />)
    fireEvent.click(byTestId('bluetooth-connect'))
    await waitFor(() => {
      expect(byTestId('bluetooth-error').textContent).toContain('不支持 Web Bluetooth')
    })
  })
})
