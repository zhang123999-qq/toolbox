// @vitest-environment jsdom
/**
 * camera-test 组件测试（#836）：MediaDevices 全 mock。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

const fakeStream = { getTracks: (): never[] => [] }

function stubMediaDevices(opts?: { deny?: boolean }): void {
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: {
      getUserMedia: opts?.deny
        ? vi.fn().mockRejectedValue(new Error('denied'))
        : vi.fn().mockResolvedValue(fakeStream),
      enumerateDevices: vi.fn().mockResolvedValue([
        { kind: 'videoinput', deviceId: 'cam-1', label: '前置摄像头' },
        { kind: 'audioinput', deviceId: 'mic-1', label: '麦克风' },
      ]),
    },
    configurable: true,
  })
}

describe('camera-test · Tool', () => {
  beforeEach(() => {
    stubMediaDevices()
  })

  it('初始显示未开始，设备列表在开始预览时加载', async () => {
    render(<Tool />)
    expect(byTestId('camera-status').textContent).toContain('未开始')
    expect(byTestId('camera-device').textContent).toContain('默认')
    fireEvent.click(byTestId('camera-start'))
    await waitFor(() => {
      expect(byTestId('camera-device').textContent).toContain('前置摄像头')
    })
  })

  it('开始预览后进入预览中', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('camera-start'))
    await waitFor(() => {
      expect(byTestId('camera-status').textContent).toContain('预览中')
    })
    expect(byTestId('camera-stop')).toBeTruthy()
  })

  it('停止预览回到未开始', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('camera-start'))
    await waitFor(() => {
      expect(byTestId('camera-stop')).toBeTruthy()
    })
    fireEvent.click(byTestId('camera-stop'))
    expect(byTestId('camera-status').textContent).toContain('未开始')
  })

  it('权限被拒绝显示中文提示', async () => {
    stubMediaDevices({ deny: true })
    render(<Tool />)
    fireEvent.click(byTestId('camera-start'))
    await waitFor(() => {
      expect(byTestId('camera-status').textContent).toContain('权限被拒绝')
    })
  })

  it('分辨率切换下拉含 4 档', () => {
    render(<Tool />)
    const preset = byTestId('camera-preset') as HTMLSelectElement
    expect(preset.options.length).toBe(4)
    fireEvent.change(preset, { target: { value: 'hd' } })
    expect(preset.value).toBe('hd')
  })
})
