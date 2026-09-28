/**
 * sse（#754）纯函数与客户端封装：URL 校验、事件流状态机、消息日志。
 * C 级工具：浏览器内置 EventSource 直连目标服务器，无第三方 API。
 */

export type SseStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error'

export interface SseMessage {
  id: string
  event: string
  data: string
  time: string
}

/** EventSource 原始事件最小结构 */
export interface SseRawEvent {
  data?: string
  lastEventId?: string
}

/** EventSource 最小接口（便于注入 mock） */
export interface SseLike {
  close(): void
  onopen: ((ev?: unknown) => void) | null
  onmessage: ((ev: SseRawEvent) => void) | null
  onerror: ((ev?: unknown) => void) | null
  addEventListener(type: string, listener: (ev: SseRawEvent) => void): void
}

export type SseFactory = (url: string) => SseLike

/** 默认工厂：浏览器原生 EventSource（仅在浏览器运行时调用） */
export function defaultSseFactory(url: string): SseLike {
  return new EventSource(url) as unknown as SseLike
}

export interface SseEvents {
  onStatus?: (s: SseStatus) => void
  onMessage?: (m: SseMessage) => void
}

/** 校验 SSE 地址 */
export function parseSseUrl(url: string): string {
  const trimmed = url.trim()
  if (trimmed === '') throw new Error('请输入 SSE 地址，如 https://api.example.com/events')
  if (!/^https?:\/\//i.test(trimmed)) throw new Error('URL 必须以 http:// 或 https:// 开头')
  return trimmed
}

/** 解析自定义事件名（逗号分隔，去空去重） */
export function parseCustomEvents(raw: string): string[] {
  const out: string[] = []
  for (const part of raw.split(',')) {
    const name = part.trim()
    if (name !== '' && !out.includes(name)) out.push(name)
  }
  return out
}

/** SSE 测试客户端：连接 / 断开，维护事件日志 */
export class SseTester {
  private es: SseLike | null = null
  private status: SseStatus = 'idle'
  private log: SseMessage[] = []

  constructor(
    private readonly factory: SseFactory = defaultSseFactory,
    private readonly events: SseEvents = {},
  ) {}

  getStatus(): SseStatus {
    return this.status
  }

  getLog(): SseMessage[] {
    return [...this.log]
  }

  clearLog(): void {
    this.log = []
  }

  private setStatus(s: SseStatus): void {
    this.status = s
    this.events.onStatus?.(s)
  }

  private push(event: string, raw: SseRawEvent): void {
    const m: SseMessage = {
      id: raw.lastEventId ?? '',
      event,
      data: raw.data ?? '',
      time: new Date().toISOString(),
    }
    this.log.push(m)
    this.events.onMessage?.(m)
  }

  connect(url: string, customEvents: string[] = []): void {
    const parsed = parseSseUrl(url)
    this.disconnect()
    this.setStatus('connecting')
    const es = this.factory(parsed)
    es.onopen = () => {
      this.setStatus('open')
    }
    es.onmessage = (ev) => {
      this.push('message', ev)
    }
    for (const name of customEvents) {
      es.addEventListener(name, (ev) => {
        this.push(name, ev)
      })
    }
    es.onerror = () => {
      this.setStatus('error')
    }
    this.es = es
  }

  disconnect(): void {
    const es = this.es
    this.es = null
    if (es !== null) {
      try {
        es.close()
      } catch {
        /* 关闭已失效连接时忽略 */
      }
      if (this.status === 'connecting' || this.status === 'open') this.setStatus('closed')
    }
  }
}
