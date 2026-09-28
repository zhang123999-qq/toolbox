/**
 * websocket（#753）纯函数与客户端封装：URL 校验、消息格式化、连接状态机。
 * C 级工具：浏览器内置 WebSocket 直连目标服务器，无第三方 API。
 */

export type WsStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export interface WsMessage {
  dir: 'in' | 'out'
  time: string
  text: string
}

/** 校验 WebSocket 地址 */
export function parseWsUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入 WebSocket 地址，如 wss://echo.example.com')
  if (!/^wss?:\/\//i.test(trimmed)) throw new Error('地址必须以 ws:// 或 wss:// 开头')
  return trimmed
}

/** 字节数组转 hex */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** 格式化收到的消息：文本原样展示（超长截断），二进制转 hex */
export function formatWsMessage(data: unknown): string {
  if (typeof data === 'string') {
    return data.length > 2000 ? data.slice(0, 2000) + '…（已截断）' : data
  }
  if (data instanceof ArrayBuffer) {
    const u8 = new Uint8Array(data)
    return '[二进制 ' + u8.byteLength + ' 字节] ' + bytesToHex(u8)
  }
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView
    const u8 = new Uint8Array(view.buffer, view.byteOffset, view.byteLength)
    return '[二进制 ' + u8.byteLength + ' 字节] ' + bytesToHex(u8)
  }
  return '[非文本消息]'
}

/** WebSocket 最小接口（便于注入 mock） */
export interface WsLike {
  send(data: string): void
  close(): void
  onopen: (() => void) | null
  onmessage: ((ev: { data: unknown }) => void) | null
  onerror: (() => void) | null
  onclose: (() => void) | null
}

export type WsFactory = (url: string) => WsLike

export interface WsEvents {
  onStatus?: (s: WsStatus) => void
  onMessage?: (m: WsMessage) => void
}

/** 默认工厂：浏览器原生 WebSocket（仅在浏览器运行时调用） */
export function defaultWsFactory(url: string): WsLike {
  return new WebSocket(url) as unknown as WsLike
}

/** WebSocket 测试客户端：连接 / 发送 / 断开，维护消息日志 */
export class WsTester {
  private ws: WsLike | null = null
  private status: WsStatus = 'idle'
  private log: WsMessage[] = []

  constructor(
    private readonly factory: WsFactory = defaultWsFactory,
    private readonly events: WsEvents = {},
  ) {}

  getStatus(): WsStatus {
    return this.status
  }

  getLog(): WsMessage[] {
    return [...this.log]
  }

  clearLog(): void {
    this.log = []
  }

  private setStatus(s: WsStatus): void {
    this.status = s
    this.events.onStatus?.(s)
  }

  private push(dir: 'in' | 'out', text: string): void {
    const m: WsMessage = { dir, time: new Date().toISOString(), text }
    this.log.push(m)
    this.events.onMessage?.(m)
  }

  connect(url: string): void {
    const parsed = parseWsUrl(url)
    this.disconnect()
    this.setStatus('connecting')
    const ws = this.factory(parsed)
    ws.onopen = () => {
      this.setStatus('open')
    }
    ws.onmessage = (ev) => {
      this.push('in', formatWsMessage(ev.data))
    }
    ws.onerror = () => {
      this.setStatus('error')
    }
    ws.onclose = () => {
      if (this.status === 'connecting' || this.status === 'open') this.setStatus('closed')
    }
    this.ws = ws
  }

  send(text: string): void {
    if (this.ws === null || this.status !== 'open') throw new Error('尚未建立连接，无法发送消息')
    if (text === '') throw new Error('发送内容不能为空')
    this.ws.send(text)
    this.push('out', text)
  }

  disconnect(): void {
    const ws = this.ws
    this.ws = null
    if (ws !== null) {
      try {
        ws.close()
      } catch {
        /* 关闭已失效连接时忽略 */
      }
      if (this.status === 'connecting' || this.status === 'open') this.setStatus('closed')
    }
  }
}
