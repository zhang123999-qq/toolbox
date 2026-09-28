/**
 * sse（#754）utils 单测：URL 校验、事件名解析、状态机（EventSource 全 mock）。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  SseTester,
  defaultSseFactory,
  parseCustomEvents,
  parseSseUrl,
  type SseLike,
  type SseStatus,
} from './utils'

class MockEs implements SseLike {
  onopen: ((ev?: unknown) => void) | null = null
  onmessage: ((ev: { data?: string; lastEventId?: string }) => void) | null = null
  onerror: ((ev?: unknown) => void) | null = null
  listeners = new Map<string, Array<(ev: { data?: string; lastEventId?: string }) => void>>()
  closed = false
  constructor(readonly url: string) {}
  addEventListener(type: string, listener: (ev: { data?: string }) => void): void {
    const arr = this.listeners.get(type) ?? []
    arr.push(listener)
    this.listeners.set(type, arr)
  }
  close(): void {
    this.closed = true
  }
  emit(type: string, ev: { data?: string; lastEventId?: string }): void {
    for (const l of this.listeners.get(type) ?? []) l(ev)
  }
}

function makeTester() {
  const instances: MockEs[] = []
  const statuses: SseStatus[] = []
  const tester = new SseTester(
    (url) => {
      const m = new MockEs(url)
      instances.push(m)
      return m
    },
    { onStatus: (s) => statuses.push(s) },
  )
  return { tester, instances, statuses }
}

describe('parseSseUrl', () => {
  it('空地址抛错', () => {
    expect(() => parseSseUrl('  ')).toThrow('请输入 SSE 地址')
  })
  it('非 http(s) 抛错', () => {
    expect(() => parseSseUrl('wss://x.com')).toThrow('必须以 http:// 或 https:// 开头')
  })
  it('合法地址去空格返回', () => {
    expect(parseSseUrl(' https://api.example.com/events ')).toBe('https://api.example.com/events')
  })
})

describe('parseCustomEvents', () => {
  it('逗号分隔去空去重', () => {
    expect(parseCustomEvents('a, b,,a, ,c')).toEqual(['a', 'b', 'c'])
  })
  it('空字符串返回空数组', () => {
    expect(parseCustomEvents('  , ')).toEqual([])
  })
})

describe('defaultSseFactory', () => {
  it('使用全局 EventSource 构造', () => {
    const ctor = vi.fn()
    vi.stubGlobal('EventSource', ctor)
    try {
      defaultSseFactory('https://x.com/e')
      expect(ctor).toHaveBeenCalledWith('https://x.com/e')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('SseTester 状态机', () => {
  it('初始状态 idle', () => {
    const { tester } = makeTester()
    expect(tester.getStatus()).toBe('idle')
    expect(tester.getLog()).toEqual([])
  })
  it('非法地址直接抛错', () => {
    const { tester } = makeTester()
    expect(() => tester.connect('ftp://x.com')).toThrow('必须以 http:// 或 https:// 开头')
  })
  it('连接成功走 open', () => {
    const { tester, instances, statuses } = makeTester()
    tester.connect('https://api.example.com/events')
    expect(instances[0].url).toBe('https://api.example.com/events')
    expect(tester.getStatus()).toBe('connecting')
    instances[0].onopen?.()
    expect(tester.getStatus()).toBe('open')
    expect(statuses).toEqual(['connecting', 'open'])
  })
  it('收到 message 事件记入日志', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://api.example.com/events')
    instances[0].onopen?.()
    instances[0].onmessage?.({ data: 'hello', lastEventId: '42' })
    const log = tester.getLog()
    expect(log).toHaveLength(1)
    expect(log[0]).toMatchObject({ event: 'message', data: 'hello', id: '42' })
    expect(log[0].time).toBeTruthy()
  })
  it('缺字段事件用空字符串兜底', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://api.example.com/events')
    instances[0].onmessage?.({})
    expect(tester.getLog()[0]).toMatchObject({ event: 'message', data: '', id: '' })
  })
  it('自定义事件名被监听并记入日志', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://api.example.com/events', ['update', 'alert'])
    instances[0].onopen?.()
    instances[0].emit('update', { data: '{"v":1}' })
    const log = tester.getLog()
    expect(log).toHaveLength(1)
    expect(log[0].event).toBe('update')
    expect(log[0].data).toBe('{"v":1}')
  })
  it('出错进入 error', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://api.example.com/events')
    instances[0].onerror?.()
    expect(tester.getStatus()).toBe('error')
  })
  it('未连接时 disconnect 无操作', () => {
    const { tester } = makeTester()
    expect(() => tester.disconnect()).not.toThrow()
    expect(tester.getStatus()).toBe('idle')
  })
  it('disconnect 关闭连接并置 closed', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://api.example.com/events')
    instances[0].onopen?.()
    tester.disconnect()
    expect(instances[0].closed).toBe(true)
    expect(tester.getStatus()).toBe('closed')
  })
  it('error 状态下 disconnect 不改状态', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://api.example.com/events')
    instances[0].onerror?.()
    tester.disconnect()
    expect(tester.getStatus()).toBe('error')
  })
  it('重复 connect 先断开旧连接', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://a.example.com/e')
    tester.connect('https://b.example.com/e')
    expect(instances[0].closed).toBe(true)
    expect(instances[1].url).toBe('https://b.example.com/e')
  })
  it('clearLog 清空日志', () => {
    const { tester, instances } = makeTester()
    tester.connect('https://api.example.com/events')
    instances[0].onmessage?.({ data: 'x' })
    expect(tester.getLog()).toHaveLength(1)
    tester.clearLog()
    expect(tester.getLog()).toEqual([])
  })
  it('事件回调被触发', () => {
    const onMessage = vi.fn()
    const t = new SseTester((url) => new MockEs(url), { onMessage })
    t.connect('https://api.example.com/events')
    const es = (t as unknown as { es: MockEs }).es
    es.onmessage?.({ data: 'm' })
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0].event).toBe('message')
  })
  it('close 抛错时被吞掉', () => {
    const bad: SseLike = {
      close: () => {
        throw new Error('boom')
      },
      onopen: null,
      onmessage: null,
      onerror: null,
      addEventListener: () => {},
    }
    const t = new SseTester(() => bad)
    t.connect('https://api.example.com/events')
    expect(() => t.disconnect()).not.toThrow()
  })
})
