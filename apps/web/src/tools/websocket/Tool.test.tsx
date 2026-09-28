// @vitest-environment jsdom
/**
 * websocket 组件测试（#753）：连接 / 发送 / 日志（WebSocket 全 mock）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import type { WsLike } from './utils'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

class MockWs implements WsLike {
  static instances: MockWs[] = []
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []
  constructor(readonly url: string) {
    MockWs.instances.push(this)
  }
  send(data: string): void {
    this.sent.push(data)
  }
  close(): void {}
}

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function setup(): void {
  MockWs.instances = []
  vi.stubGlobal('WebSocket', MockWs)
}

describe('websocket · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    setup()
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['ws-connect', 'ws-disconnect', 'ws-status', 'ws-send-input', 'ws-send', 'ws-log']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('连接成功状态变为已连接', async () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('ws-connect'))
    expect(byTestId('ws-status').textContent).toContain('连接中')
    act(() => {
      MockWs.instances[0].onopen?.()
    })
    expect(byTestId('ws-status').textContent).toContain('已连接')
  })

  it('非法地址显示中文错误', () => {
    setup()
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'http://x.com' } })
    fireEvent.click(byTestId('ws-connect'))
    expect(byTestId('ws-error').textContent).toContain('ws:// 或 wss://')
  })

  it('发送消息后日志出现发送记录', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('ws-connect'))
    act(() => {
      MockWs.instances[0].onopen?.()
    })
    fireEvent.change(byTestId('ws-send-input'), { target: { value: 'hello' } })
    fireEvent.click(byTestId('ws-send'))
    expect(MockWs.instances[0].sent).toEqual(['hello'])
    expect(byTestId('ws-log').textContent).toContain('发送')
    expect(byTestId('ws-log').textContent).toContain('hello')
  })

  it('收到消息后日志出现收到记录', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('ws-connect'))
    act(() => {
      MockWs.instances[0].onopen?.()
      MockWs.instances[0].onmessage?.({ data: 'world' })
    })
    expect(byTestId('ws-log').textContent).toContain('收到')
    expect(byTestId('ws-log').textContent).toContain('world')
  })

  it('出错后状态显示连接出错', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('ws-connect'))
    act(() => {
      MockWs.instances[0].onerror?.()
    })
    expect(byTestId('ws-status').textContent).toContain('连接出错')
  })

  it('断开后状态显示已断开', () => {
    setup()
    render(<Tool />)
    fireEvent.click(byTestId('ws-connect'))
    act(() => {
      MockWs.instances[0].onopen?.()
    })
    fireEvent.click(byTestId('ws-disconnect'))
    expect(byTestId('ws-status').textContent).toContain('已断开')
  })
})
