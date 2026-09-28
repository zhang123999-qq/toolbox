import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { WebsocketInput } from './schema'
import { WsTester, type WsMessage, type WsStatus } from './utils'

const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900'

const STATUS_TEXT: Record<WsStatus, string> = {
  idle: '未连接',
  connecting: '连接中…',
  open: '已连接',
  closed: '已断开',
  error: '连接出错',
}

const STATUS_CLS: Record<WsStatus, string> = {
  idle: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  connecting: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  open: 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  error: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function formatLog(log: WsMessage[]): string {
  return log.map((m) => `[${m.time}] ${m.dir === 'in' ? '收到' : '发送'}：${m.text}`).join('\n')
}

export default function Tool() {
  const [status, setStatus] = useState<WsStatus>('idle')
  const [log, setLog] = useState<WsMessage[]>([])
  const [message, setMessage] = useState('ping')
  const [error, setError] = useState('')
  const testerRef = useRef<WsTester | null>(null)
  if (testerRef.current === null) {
    testerRef.current = new WsTester(undefined, {
      onStatus: (s) => setStatus(s),
      onMessage: (m) => setLog((prev) => [...prev, m]),
    })
  }

  useEffect(() => {
    const t = testerRef.current
    return () => {
      t?.disconnect()
    }
  }, [])

  function handleConnect(input: WebsocketInput): void {
    setError('')
    try {
      testerRef.current?.connect(input.text)
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败')
    }
  }

  function handleSend(): void {
    setError('')
    try {
      testerRef.current?.send(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    }
  }

  function handleDisconnect(): void {
    testerRef.current?.disconnect()
  }

  function handleClear(): void {
    testerRef.current?.clearLog()
    setLog([])
  }

  return (
    <MultiPanel<WebsocketInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'wss://echo.websocket.org' }}
      initialOptions={{}}
      example={{ text: 'wss://echo.websocket.org' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="ws-connect"
              onClick={() => handleConnect(input)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white dark:bg-blue-500"
            >
              连接
            </button>
            <button
              type="button"
              data-testid="ws-disconnect"
              onClick={handleDisconnect}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600"
            >
              断开
            </button>
            <span
              data-testid="ws-status"
              className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLS[status]}`}
            >
              {STATUS_TEXT[status]}
            </span>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">发送消息</span>
            <div className="flex gap-2">
              <input
                data-testid="ws-send-input"
                className={INPUT_CLS}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="输入要发送的文本消息"
              />
              <button
                type="button"
                data-testid="ws-send"
                onClick={handleSend}
                className="shrink-0 rounded bg-blue-600 px-4 py-1.5 text-sm text-white dark:bg-blue-500"
              >
                发送
              </button>
            </div>
          </label>
          {error !== '' && (
            <p data-testid="ws-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              消息日志（{log.length} 条）
            </span>
            <button
              type="button"
              data-testid="ws-clear"
              onClick={handleClear}
              className="text-xs text-slate-500 underline dark:text-slate-400"
            >
              清空日志
            </button>
          </div>
          <ul data-testid="ws-log" className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {log.map((m, i) => (
              <li
                key={i}
                className={`rounded px-2 py-1 font-mono text-xs ${
                  m.dir === 'in'
                    ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                <span className="text-slate-400">[{m.time}]</span>{' '}
                {m.dir === 'in' ? '收到' : '发送'}：{m.text}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：使用浏览器原生 WebSocket 直连目标服务器；wss 地址需要目标证书有效。
            二进制消息会自动转为 hex 展示。
          </p>
        </div>
      )}
      toText={() => formatLog(log)}
    />
  )
}
