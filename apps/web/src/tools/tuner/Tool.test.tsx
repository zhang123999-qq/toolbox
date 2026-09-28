// @vitest-environment jsdom
/**
 * tuner 组件测试
 *
 * jsdom 没有麦克风与 AudioContext：getUserMedia 与 AudioContext 全部 mock。
 * Analyser 的 getFloatTimeDomainData 直接灌 440Hz 正弦，验证端到端显示 A4。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

class MockAudioContext {
  readonly sampleRate = 48000
  createMediaStreamSource() {
    return { connect: () => {} }
  }
  createAnalyser() {
    return {
      fftSize: 4096,
      /** 灌 440Hz 正弦，模拟真实麦克风输入 */
      getFloatTimeDomainData: (buf: Float32Array) => {
        for (let i = 0; i < buf.length; i++) {
          buf[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / 48000)
        }
      },
      connect: () => {},
    }
  }
  async close(): Promise<void> {}
}

const fakeStream = { getTracks: () => [] }

function stubAll(): void {
  vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
  Object.defineProperty(globalThis.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
    configurable: true,
  })
}

beforeEach(stubAll)

describe('tuner · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供监听按钮与音名显示区', () => {
    render(<Tool />)
    expect(byTestId('start-stop').textContent).toBe('开始监听')
    expect(byTestId('note-name')).toBeTruthy()
    expect(byTestId('cents')).toBeTruthy()
  })

  it('开始监听 → 检测到 440Hz 显示 A4 与音准', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('note-name').textContent).toBe('A4'), {
      timeout: 10000,
    })
    expect(byTestId('freq').textContent).toMatch(/440\.\d Hz/)
    expect(byTestId('cents').textContent).toContain('音分')
    expect(byTestId('tuning-hint').textContent).toContain('音准')
  })

  it('停止监听 → 按钮恢复', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('start-stop').textContent).toBe('停止监听'))
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('start-stop').textContent).toBe('开始监听'))
  })

  it('麦克风被拒绝 → 中文错误提示', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi
          .fn()
          .mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' })),
      },
      configurable: true,
    })
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('麦克风权限被拒绝')
  })

  it('浏览器不支持麦克风采集 → 中文错误提示', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    })
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('不支持麦克风采集')
  })
})
