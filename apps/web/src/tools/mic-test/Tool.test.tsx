// @vitest-environment jsdom
/**
 * mic-test 组件测试（#835）：MediaDevices / AudioContext 全 mock。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

class MockAnalyser {
  fftSize = 512
  getByteTimeDomainData(data: Uint8Array): void {
    data.fill(128)
  }
}

class MockAudioContext {
  createMediaStreamSource(): { connect: () => void } {
    return { connect: () => undefined }
  }
  createAnalyser(): MockAnalyser {
    return new MockAnalyser()
  }
  close(): Promise<void> {
    return Promise.resolve()
  }
}

const fakeStream = { getTracks: (): never[] => [] }

function stubSuccess(): void {
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
    configurable: true,
  })
  vi.stubGlobal('AudioContext', MockAudioContext)
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(0))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}

function stubDenied(): void {
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    configurable: true,
  })
  vi.stubGlobal('AudioContext', MockAudioContext)
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(0))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
}

describe('mic-test · Tool', () => {
  beforeEach(() => {
    stubSuccess()
  })

  it('初始显示未开始状态与开始按钮', () => {
    render(<Tool />)
    expect(byTestId('mic-status').textContent).toContain('未开始')
    expect(byTestId('mic-start')).toBeTruthy()
    expect(byTestId('mic-level').textContent).toContain('0%')
  })

  it('开始检测后进入检测中并显示电平', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('mic-start'))
    await waitFor(() => {
      expect(byTestId('mic-status').textContent).toContain('检测中')
    })
    expect(byTestId('mic-level').textContent).toContain('0%')
    expect(byTestId('mic-level').textContent).toContain('静音')
  })

  it('停止检测回到未开始', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('mic-start'))
    await waitFor(() => {
      expect(byTestId('mic-stop')).toBeTruthy()
    })
    fireEvent.click(byTestId('mic-stop'))
    expect(byTestId('mic-status').textContent).toContain('未开始')
  })

  it('权限被拒绝显示中文提示', async () => {
    stubDenied()
    render(<Tool />)
    fireEvent.click(byTestId('mic-start'))
    await waitFor(() => {
      expect(byTestId('mic-status').textContent).toContain('权限被拒绝')
    })
  })
})
