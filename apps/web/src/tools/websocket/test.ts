/**
 * websocket（#753）utils 单测：URL 校验、消息格式化、状态机（WebSocket 全 mock）。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  WsTester,
  bytesToHex,
  defaultWsFactory,
  formatWsMessage,
  parseWsUrl,
  type WsLike,
  type WsStatus,
} from './utils'

class MockWs implements WsLike {
  onopen: (() => void) | null = null
  onmessage: ((ev: { data: unknown }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  sent: string[] = []
  closed = false
  constructor(readonly url: string) {}
  send(data: string): void {
    this.sent.push(data)
  }
  close(): void {
    this.closed = true
  }
}

function makeTester() {
  const instances: MockWs[] = []
  const statuses: WsStatus[] = []
  const tester = new WsTester(
    (url) => {
      const m = new MockWs(url)
      instances.push(m)
      return m
    },
    { onStatus: (s) => statuses.push(s) },
  )
  return { tester, instances, statuses }
}

describe('parseWsUrl', () => {
  it('空地址抛错', () => {
    expect(() => parseWsUrl('   ')).toThrow('请输入 WebSocket 地址')
  })
  it('非 ws/wss 协议抛错', () => {
    expect(() => parseWsUrl('https://x.com')).toThrow('必须以 ws:// 或 wss:// 开头')
  })
  it('合法地址去空格返回', () => {
    expect(parseWsUrl('  wss://echo.example.com/socket  ')).toBe('wss://echo.example.com/socket')
  })
  it('ws:// 通过', () => {
    expect(parseWsUrl('ws://127.0.0.1:8080')).toBe('ws://127.0.0.1:8080')
  })
})

describe('bytesToHex', () => {
  it('字节转 hex', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff')
  })
  it('空数组', () => {
    expect(bytesToHex(new Uint8Array([]))).toBe('')
  })
})

describe('formatWsMessage', () => {
  it('短文本原样', () => {
    expect(formatWsMessage('hello')).toBe('hello')
  })
  it('超长文本截断', () => {
    const out = formatWsMessage('a'.repeat(2001))
    expect(out).toContain('已截断')
    expect(out.length).toBeLessThan(2010)
  })
  it('ArrayBuffer 转 hex', () => {
    const buf = new Uint8Array([0xde, 0xad]).buffer
    expect(formatWsMessage(buf)).toBe('[二进制 2 字节] dead')
  })
  it('TypedArray 视图转 hex', () => {
    expect(formatWsMessage(new Uint8Array([1, 2]))).toBe('[二进制 2 字节] 0102')
  })
  it('其他类型标非文本', () => {
    expect(formatWsMessage(42)).toBe('[非文本消息]')
    expect(formatWsMessage(null)).toBe('[非文本消息]')
  })
})

describe('defaultWsFactory', () => {
  it('使用全局 WebSocket 构造', () => {
    const ctor = vi.fn()
    vi.stubGlobal('WebSocket', ctor)
    try {
      defaultWsFactory('wss://echo.example.com')
      expect(ctor).toHaveBeenCalledWith('wss://echo.example.com')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})

describe('WsTester 状态机', () => {
  it('初始状态 idle', () => {
    const { tester } = makeTester()
    expect(tester.getStatus()).toBe('idle')
    expect(tester.getLog()).toEqual([])
  })
  it('非法地址直接抛错', () => {
    const { tester } = makeTester()
    expect(() => tester.connect('http://x.com')).toThrow('必须以 ws:// 或 wss:// 开头')
  })
  it('连接成功走 open', () => {
    const { tester, instances, statuses } = makeTester()
    tester.connect('wss://echo.example.com')
    expect(instances[0].url).toBe('wss://echo.example.com')
    expect(tester.getStatus()).toBe('connecting')
    instances[0].onopen?.()
    expect(tester.getStatus()).toBe('open')
    expect(statuses).toEqual(['connecting', 'open'])
  })
  it('收到文本消息记入日志', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onopen?.()
    instances[0].onmessage?.({ data: 'hi' })
    const log = tester.getLog()
    expect(log).toHaveLength(1)
    expect(log[0].dir).toBe('in')
    expect(log[0].text).toBe('hi')
    expect(log[0].time).toBeTruthy()
  })
  it('收到二进制消息转 hex', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onopen?.()
    instances[0].onmessage?.({ data: new Uint8Array([9]) })
    expect(tester.getLog()[0].text).toBe('[二进制 1 字节] 09')
  })
  it('出错进入 error', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onerror?.()
    expect(tester.getStatus()).toBe('error')
  })
  it('error 后 onclose 不覆盖状态', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onerror?.()
    instances[0].onclose?.()
    expect(tester.getStatus()).toBe('error')
  })
  it('正常关闭进入 closed', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onopen?.()
    instances[0].onclose?.()
    expect(tester.getStatus()).toBe('closed')
  })
  it('连接中收到 onclose 进入 closed', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onclose?.()
    expect(tester.getStatus()).toBe('closed')
  })
  it('未连接时发送抛错', () => {
    const { tester } = makeTester()
    expect(() => tester.send('hi')).toThrow('尚未建立连接')
  })
  it('连接中发送抛错', () => {
    const { tester } = makeTester()
    tester.connect('wss://echo.example.com')
    expect(() => tester.send('hi')).toThrow('尚未建立连接')
  })
  it('空内容发送抛错', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onopen?.()
    expect(() => tester.send('')).toThrow('发送内容不能为空')
  })
  it('发送成功记入日志', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onopen?.()
    tester.send('ping')
    expect(instances[0].sent).toEqual(['ping'])
    const log = tester.getLog()
    expect(log).toHaveLength(1)
    expect(log[0].dir).toBe('out')
    expect(log[0].text).toBe('ping')
  })
  it('disconnect 关闭连接并置 closed', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onopen?.()
    tester.disconnect()
    expect(instances[0].closed).toBe(true)
    expect(tester.getStatus()).toBe('closed')
  })
  it('未连接时 disconnect 无操作', () => {
    const { tester } = makeTester()
    expect(() => tester.disconnect()).not.toThrow()
    expect(tester.getStatus()).toBe('idle')
  })
  it('重复 connect 先断开旧连接', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://a.example.com')
    tester.connect('wss://b.example.com')
    expect(instances[0].closed).toBe(true)
    expect(instances[1].url).toBe('wss://b.example.com')
  })
  it('error 状态下 disconnect 关闭连接但不改状态', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onerror?.()
    tester.disconnect()
    expect(instances[0].closed).toBe(true)
    expect(tester.getStatus()).toBe('error')
  })
  it('clearLog 清空日志', () => {
    const { tester, instances } = makeTester()
    tester.connect('wss://echo.example.com')
    instances[0].onopen?.()
    tester.send('x')
    expect(tester.getLog()).toHaveLength(1)
    tester.clearLog()
    expect(tester.getLog()).toEqual([])
  })
  it('事件回调被触发', () => {
    const onMessage = vi.fn()
    const t = new WsTester((url) => new MockWs(url), { onMessage })
    t.connect('wss://echo.example.com')
    const ws = (t as unknown as { ws: MockWs }).ws
    ws.onopen?.()
    ws.onmessage?.({ data: 'm' })
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage.mock.calls[0][0].dir).toBe('in')
  })
  it('close 抛错时被吞掉', () => {
    const bad: WsLike = {
      send: () => {},
      close: () => {
        throw new Error('boom')
      },
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    }
    const t = new WsTester(() => bad)
    t.connect('wss://echo.example.com')
    expect(() => t.disconnect()).not.toThrow()
  })
})
