import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ApiMockInput } from './schema'
import {
  DEFAULT_REQUEST_LINE,
  DEFAULT_ROUTES_JSON,
  formatResult,
  matchMockRequest,
  parseJsonBody,
  parseRequestLine,
  validateRoutes,
  type MatchResult,
} from './utils'

function simulate(input: ApiMockInput, routesRaw: string, bodyRaw: string): MatchResult {
  const parsed = parseRequestLine(input.text)
  const routes = validateRoutes(routesRaw)
  const body = parseJsonBody(bodyRaw)
  return matchMockRequest(routes, { ...parsed, body })
}

export default function Tool() {
  const [routesRaw, setRoutesRaw] = useState(DEFAULT_ROUTES_JSON)
  const [bodyRaw, setBodyRaw] = useState('')

  function resultOf(input: ApiMockInput): { text: string; error: string; matched: boolean } {
    try {
      const r = simulate(input, routesRaw, bodyRaw)
      return { text: formatResult(r), error: '', matched: r.matched }
    } catch (err) {
      return { text: '', error: err instanceof Error ? err.message : '参数错误', matched: false }
    }
  }

  return (
    <MultiPanel<ApiMockInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: DEFAULT_REQUEST_LINE }}
      initialOptions={{}}
      example={{ text: 'POST /users' }}
      renderOutput={(input) => {
        const r = resultOf(input)
        return (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">路由规则（JSON 数组）</span>
              <textarea
                data-testid="routes"
                rows={10}
                className="rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={routesRaw}
                onChange={(e) => setRoutesRaw(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">请求体（JSON，可空）</span>
              <textarea
                data-testid="request-body"
                rows={3}
                className="rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                value={bodyRaw}
                onChange={(e) => setBodyRaw(e.target.value)}
              />
            </label>
            {r.error !== '' && (
              <p data-testid="mock-error" className="text-sm text-red-600 dark:text-red-400">
                {r.error}
              </p>
            )}
            {r.error === '' && (
              <pre
                data-testid="mock-result"
                data-matched={r.matched ? 'true' : 'false'}
                className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {r.text}
              </pre>
            )}
          </div>
        )
      }}
      toText={(input) => resultOf(input).text}
    />
  )
}
