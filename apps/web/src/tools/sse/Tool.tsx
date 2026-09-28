import { useEffect, useRef, useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { SseInput } from './schema'
import { SseTester, parseCustomEvents, type SseMessage, type SseStatus } from './utils'

const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900'

const STATUS_TEXT: Record<SseStatus, string> = {
  idle: '未连接',
  connecting: '连接中…',
  open: '已连接',
  closed: '已断开',
  error: '连接出错',
}

const STATUS_CLS: Record<SseStatus, string> = {
  idle: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  connecting: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  open: 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200',
  closed: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  error: 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function formatLog(log: SseMessage[]): string {
  return log
    .map((m) => `[${m.time}] 事件 ${m.event}${m.id !== '' ? ' #' + m.id : ''}：${m.data}`)
    .join('\n')
}

export default function Tool() {
  const [status, setStatus] = useState<SseStatus>('idle')
  const [log, setLog] = useState<SseMessage[]>([])
  const [eventsRaw, setEventsRaw] = useState('update, notification')
  const [error, setError] = useState('')
  const testerRef = useRef<SseTester | null>(null)
  if (testerRef.current === null) {
    testerRef.current = new SseTester(undefined, {
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

  function handleConnect(input: SseInput): void {
    setError('')
    try {
      testerRef.current?.connect(input.text, parseCustomEvents(eventsRaw))
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败')
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
    <MultiPanel<SseInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'https://api.example.com/events' }}
      initialOptions={{}}
      example={{ text: 'https://api.example.com/events' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="sse-connect"
              onClick={() => handleConnect(input)}
              className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white dark:bg-blue-500"
            >
              连接
            </button>
            <button
              type="button"
              data-testid="sse-disconnect"
              onClick={handleDisconnect}
              className="rounded border border-slate-300 px-4 py-1.5 text-sm dark:border-slate-600"
            >
              断开
            </button>
            <span
              data-testid="sse-status"
              className={`rounded px-2 py-1 text-xs font-medium ${STATUS_CLS[status]}`}
            >
              {STATUS_TEXT[status]}
            </span>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">自定义事件名（逗号分隔）</span>
            <input
              data-testid="sse-events"
              className={INPUT_CLS}
              value={eventsRaw}
              onChange={(e) => setEventsRaw(e.target.value)}
              placeholder="如：update, notification"
            />
          </label>
          {error !== '' && (
            <p data-testid="sse-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              事件日志（{log.length} 条）
            </span>
            <button
              type="button"
              data-testid="sse-clear"
              onClick={handleClear}
              className="text-xs text-slate-500 underline dark:text-slate-400"
            >
              清空日志
            </button>
          </div>
          <ul data-testid="sse-log" className="flex max-h-64 flex-col gap-1 overflow-y-auto">
            {log.map((m, i) => (
              <li
                key={i}
                className="rounded bg-green-50 px-2 py-1 font-mono text-xs text-green-800 dark:bg-green-950 dark:text-green-300"
              >
                <span className="text-slate-400">[{m.time}]</span> 事件{' '}
                <span className="font-bold">{m.event}</span>
                {m.id !== '' && <span className="text-slate-400"> #{m.id}</span>}：{m.data}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：使用浏览器原生 EventSource 直连；目标服务器需允许跨域且返回
            text/event-stream。Last-Event-ID 由浏览器自动维护。
          </p>
        </div>
      )}
      toText={() => formatLog(log)}
    />
  )
}
