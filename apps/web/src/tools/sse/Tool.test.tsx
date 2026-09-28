// @vitest-environment jsdom
/**
 * sse 组件测试（#754）：连接 / 自定义事件 / 日志（EventSource 全 mock）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import type { SseLike, SseRawEvent } from './utils'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

class MockEs implements SseLike {
  static instances: MockEs[] = []
  onopen: ((ev?: unknown) => void) | null = null
  onmessage: ((ev: SseRawEvent) => void) | null = null
  onerror: ((ev?: unknown) => void) | null = null
  listeners = new Map<string, Array<(ev: SseRawEvent) => void>>()
  constructor(readonly url: string) {
    MockEs.instances.push(this)
  }
  addEventListener(type: string, listener: (ev: SseRawEvent) => void): void {
    const arr = this.listeners.get(type) ?? []
    arr.push(listener)
    this.listeners.set(type, arr)
  }
  close(): void {}
  emit(type: string, ev: SseRawEvent): void {
    for (const l of this.listeners.get(type) ?? []) l(ev)
  }
}

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function setup(): void {
  MockEs.instances = []
  vi.stubGlobal('EventSource', MockEs)
}

describe('sse · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    setup()
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['sse-connect', 'sse-disconnect', 'sse-status', 'sse-events', 'sse-log']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('连接成功状态变为已连接', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('sse-connect'))
    expect(byTestId('sse-status').textContent).toContain('连接中')
    act(() => {
      MockEs.instances[0].onopen?.()
    })
    expect(byTestId('sse-status').textContent).toContain('已连接')
  })

  it('非法地址显示中文错误', () => {
    setup()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'wss://x.com' } })
    fireEvent.click(byTestId('sse-connect'))
    expect(byTestId('sse-error').textContent).toContain('http:// 或 https://')
  })

  it('收到事件后日志出现记录', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('sse-connect'))
    act(() => {
      MockEs.instances[0].onopen?.()
      MockEs.instances[0].onmessage?.({ data: 'ping-data', lastEventId: '7' })
    })
    expect(byTestId('sse-log').textContent).toContain('message')
    expect(byTestId('sse-log').textContent).toContain('ping-data')
  })

  it('自定义事件名被监听', () => {
    setup()
    render(<Tool />)
    fireEvent.change(byTestId('sse-events'), { target: { value: 'update' } })
    fireEvent.click(byTestId('sse-connect'))
    act(() => {
      MockEs.instances[0].onopen?.()
      MockEs.instances[0].emit('update', { data: 'v2' })
    })
    expect(byTestId('sse-log').textContent).toContain('update')
    expect(byTestId('sse-log').textContent).toContain('v2')
  })

  it('出错后状态显示连接出错', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('sse-connect'))
    act(() => {
      MockEs.instances[0].onerror?.()
    })
    expect(byTestId('sse-status').textContent).toContain('连接出错')
  })

  it('断开后状态显示已断开', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('sse-connect'))
    act(() => {
      MockEs.instances[0].onopen?.()
    })
    fireEvent.click(byTestId('sse-disconnect'))
    expect(byTestId('sse-status').textContent).toContain('已断开')
  })
})
