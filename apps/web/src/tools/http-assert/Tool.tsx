import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import { HTTP_METHODS, type HttpAssertInput, type HttpMethod } from './schema'
import {
  DEFAULT_ASSERTIONS_JSON,
  formatReport,
  parseAssertions,
  parseHeaders,
  runHttpAssertions,
  type AssertReport,
} from './utils'

const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900'

export default function Tool() {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [headersRaw, setHeadersRaw] = useState('')
  const [bodyRaw, setBodyRaw] = useState('')
  const [assertionsRaw, setAssertionsRaw] = useState(DEFAULT_ASSERTIONS_JSON)
  const [report, setReport] = useState<AssertReport | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleRun(input: HttpAssertInput): Promise<void> {
    setPending(true)
    setError('')
    setReport(null)
    try {
      const assertions = parseAssertions(assertionsRaw)
      const r = await runHttpAssertions(
        {
          url: input.text,
          method,
          headers: parseHeaders(headersRaw),
          body: bodyRaw,
        },
        assertions,
      )
      setReport(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<HttpAssertInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'https://httpbin.org/get' }}
      initialOptions={{}}
      example={{ text: 'https://httpbin.org/status/200' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-1 text-sm">
              <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">方法</span>
              <select
                data-testid="method"
                className={INPUT_CLS}
                value={method}
                onChange={(e) => setMethod(e.target.value as HttpMethod)}
              >
                {HTTP_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">请求头（每行 Key: Value）</span>
            <textarea
              data-testid="headers"
              rows={2}
              className={INPUT_CLS}
              value={headersRaw}
              onChange={(e) => setHeadersRaw(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">请求体（GET/HEAD 不发送）</span>
            <textarea
              data-testid="body"
              rows={2}
              className={INPUT_CLS}
              value={bodyRaw}
              onChange={(e) => setBodyRaw(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">断言规则（JSON 数组）</span>
            <textarea
              data-testid="assertions"
              rows={6}
              className={INPUT_CLS}
              value={assertionsRaw}
              onChange={(e) => setAssertionsRaw(e.target.value)}
            />
          </label>
          <button
            type="button"
            data-testid="assert-run"
            disabled={pending}
            onClick={() => void handleRun(input)}
            className="w-fit rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500"
          >
            {pending ? '执行中…' : '执行测试'}
          </button>
          {error !== '' && (
            <p data-testid="assert-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {report !== null && (
            <div data-testid="assert-report" className="flex flex-col gap-1">
              {report.error !== undefined ? (
                <p className="text-sm text-red-600 dark:text-red-400">{report.error}</p>
              ) : (
                <>
                  <p
                    className={`text-sm font-medium ${report.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    测试{report.ok ? '通过' : '未通过'}：{report.passed}/{report.total}{' '}
                    条断言通过（状态 {report.status}，耗时 {report.durationMs}ms）
                  </p>
                  <ul className="flex flex-col gap-1">
                    {report.results.map((r, i) => (
                      <li
                        key={i}
                        className={`font-mono text-sm ${r.pass ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {r.pass ? '✓' : '✗'} {r.message}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：请求在浏览器内发起，目标服务器需允许 CORS，否则浏览器会拦截响应。
          </p>
        </div>
      )}
      toText={() => (report === null ? '' : formatReport(report))}
    />
  )
}
