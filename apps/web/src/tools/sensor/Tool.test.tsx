// @vitest-environment jsdom
/**
 * sensor 组件测试（#867）：派发合成 devicemotion / deviceorientation 事件。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function motionEvent(): Event {
  const ev = new Event('devicemotion')
  ;(ev as unknown as { accelerationIncludingGravity: unknown }).accelerationIncludingGravity = {
    x: 3,
    y: 4,
    z: 0,
  }
  return ev
}

function orientEvent(): Event {
  const ev = new Event('deviceorientation')
  ;(ev as unknown as { beta: number; gamma: number }).beta = 20
  ;(ev as unknown as { gamma: number }).gamma = -30
  return ev
}

describe('sensor · Tool', () => {
  it('初始三轴显示未知', () => {
    render(<Tool />)
    expect(byTestId('sensor-accel').textContent).toContain('未知')
    expect(byTestId('sensor-magnitude').textContent).toContain('0.00')
  })

  it('开始监听后收到事件更新读数', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('sensor-start'))
    await waitFor(() => {
      expect(byTestId('sensor-start').textContent).toBe('监听中…')
    })
    act(() => {
      window.dispatchEvent(motionEvent())
      window.dispatchEvent(orientEvent())
    })
    expect(byTestId('sensor-accel').textContent).toContain('X 3.00 m/s²')
    expect(byTestId('sensor-magnitude').textContent).toContain('5.00 m/s²')
    expect(byTestId('sensor-tilt').textContent).toContain('前后倾 20.00 °')
  })

  it('iOS 权限被拒绝时展示中文提示', async () => {
    vi.stubGlobal('DeviceMotionEvent', {
      requestPermission: vi.fn(async () => 'denied'),
    })
    render(<Tool />)
    fireEvent.click(byTestId('sensor-start'))
    await waitFor(() => {
      expect(byTestId('sensor-error').textContent).toContain('未获得运动传感器权限')
    })
  })
})
