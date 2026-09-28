// @vitest-environment jsdom
/**
 * metronome 组件测试
 *
 * jsdom 没有 AudioContext：用最小 mock（Tool 只用 currentTime / createOscillator /
 * createGain / destination / close），浏览器不支持分支通过卸掉全局 AudioContext 覆盖。
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

/** 最小 AudioContext 形状：记录被调度的点击声 */
class MockAudioContext {
  currentTime = 0
  readonly destination = {}
  readonly played: { when: number; freq: number }[] = []
  closed = false
  createOscillator() {
    const played = this.played
    const osc = {
      frequency: { value: 0, setValueAtTime: (v: number) => (osc.frequency.value = v) },
      connect: () => {},
      start: (when: number) => {
        played.push({ when, freq: osc.frequency.value })
      },
      stop: () => {},
    }
    return osc
  }
  createGain() {
    const gain = {
      gain: {
        value: 0,
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
      connect: () => {},
    }
    return gain
  }
  async close(): Promise<void> {
    this.closed = true
  }
}

let lastCtx: MockAudioContext | null = null

function trackCtx(ctx: MockAudioContext): void {
  lastCtx = ctx
}

function stubBrowserApis(): void {
  lastCtx = null
  const Ctor = class extends MockAudioContext {
    constructor() {
      super()
      trackCtx(this)
    }
  }
  vi.stubGlobal('AudioContext', Ctor as unknown as typeof AudioContext)
}

beforeEach(stubBrowserApis)

describe('metronome · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供开始按钮与拍点闪烁区', () => {
    render(<Tool />)
    expect(byTestId('start-stop').textContent).toBe('开始')
    expect(byTestId('beat-flash')).toBeTruthy()
    expect(byTestId('beat-1')).toBeTruthy()
  })

  it('点开始 → 调度节拍声并显示拍号标签', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('start-stop').textContent).toBe('停止'))
    expect(byTestId('tempo-label').textContent).toBe('120 BPM · 4/4 拍')
    // 调度器应已向前排了拍点（重拍 1600Hz）
    await waitFor(() => expect(lastCtx!.played.length).toBeGreaterThan(0))
    expect(lastCtx!.played[0]!.freq).toBe(1600)
  })

  it('点停止 → 定时器清理、按钮恢复', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('start-stop').textContent).toBe('停止'))
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('start-stop').textContent).toBe('开始'))
    expect(lastCtx!.closed).toBe(true)
  })

  it('BPM 非法 → 中文错误提示且不启动', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-bpm'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('start-stop'))
    expect(byTestId('error').textContent).toContain('BPM 必须是数字')
    expect(byTestId('start-stop').textContent).toBe('开始')
    expect(lastCtx).toBeNull()
  })

  it('浏览器不支持 Web Audio API → 中文错误提示', () => {
    vi.stubGlobal('AudioContext', undefined)
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    expect(byTestId('error').textContent).toContain('不支持 Web Audio API')
    expect(byTestId('start-stop').textContent).toBe('开始')
  })
})
