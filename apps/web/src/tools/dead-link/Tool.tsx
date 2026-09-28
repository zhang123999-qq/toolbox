import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { checkBatch, parseUrlList, renderReport, summarize, toInvalidResult } from './utils'
import type { DeadLinkInput, DeadLinkOptions } from './schema'
import type { DeadLinkResult } from './utils'

const EXAMPLE: DeadLinkInput = {
  text: ['https://example.com/', 'https://example.com/404-page', 'not a url'].join('\n'),
}

function statusBadge(status: DeadLinkResult['status']): string {
  switch (status) {
    case '存活':
      return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
    case '重定向':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
    case '死链':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    case '超时':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
    case '错误':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  }
}

/** D 类：浏览器 fetch 直连目标站点，无后端、无 Key */
export default function Tool() {
  const [results, setResults] = useState<readonly DeadLinkResult[] | null>(null)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [onlyDead, setOnlyDead] = useState(false)

  async function handleCheck(input: DeadLinkInput): Promise<void> {
    if (pending) return
    setError('')
    setResults(null)
    setProgress(null)
    setPending(true)
    try {
      const parsed = parseUrlList(input.text)
      const checked = await checkBatch(parsed.urls, undefined, {
        concurrency: 5,
        onProgress: (done, total) => setProgress([done, total + parsed.invalid.length]),
      })
      setResults([...checked, ...parsed.invalid.map(toInvalidResult)])
    } catch (err) {
      setError(err instanceof Error ? err.message : '检测失败，请重试')
    } finally {
      setPending(false)
      setProgress(null)
    }
  }

  const summary = results === null ? null : summarize(results)
  const shown = results === null ? [] : onlyDead ? results.filter((r) => !r.alive) : results

  return (
    <MultiPanel<DeadLinkInput, DeadLinkOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="check"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleCheck(input)}
            >
              {pending ? '检测中…' : '开始检测'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            每行一个 URL（最多 200 行），浏览器逐个发送 HEAD 请求检测（不支持时自动回退 GET），并发
            5 个。跨域被拦截的记为「错误」并注明原因，不编造成「死链」。
          </p>
          {error ? (
            <div
              role="alert"
              data-testid="error"
              className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            >
              {error}
            </div>
          ) : null}
          {progress ? (
            <p data-testid="progress" className="text-sm text-slate-600 dark:text-slate-400">
              检测中… {progress[0]} / {progress[1]}
            </p>
          ) : null}
          {summary ? (
            <div className="flex flex-wrap items-center gap-3">
              <p
                data-testid="summary"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                共 {summary.total} 个：存活 {summary.alive} 重定向 {summary.redirect} 死链{' '}
                {summary.dead}
                超时 {summary.timeout} 错误 {summary.error} 无效 {summary.invalid}
                存活率 {Math.round(summary.aliveRate * 100)}%
              </p>
              <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  data-testid="only-dead"
                  checked={onlyDead}
                  onChange={(e) => setOnlyDead(e.target.checked)}
                />
                仅看死链
              </label>
            </div>
          ) : null}
          {results ? (
            <ul data-testid="result-list" className="flex flex-col gap-1">
              {shown.map((r) => (
                <li
                  key={r.url}
                  className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-1.5 text-xs dark:border-slate-700"
                >
                  <span className={`rounded px-1.5 py-0.5 font-medium ${statusBadge(r.status)}`}>
                    {r.status}
                  </span>
                  <span className="break-all font-mono text-slate-700 dark:text-slate-300">
                    {r.url}
                  </span>
                  {r.httpStatus !== null ? (
                    <span className="text-slate-500">HTTP {r.httpStatus}</span>
                  ) : (
                    <span className="text-slate-500">{r.note}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      toText={() => (results === null ? '' : renderReport(results))}
      downloadExt="md"
    />
  )
}
