import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { GraphqlTestInput } from './schema'
import {
  DEFAULT_QUERY,
  INTROSPECTION_QUERY,
  formatGraphqlResult,
  parseHeaders,
  sendGraphql,
  type GraphqlResponse,
} from './utils'

const INPUT_CLS =
  'w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900'

export default function Tool() {
  const [query, setQuery] = useState(DEFAULT_QUERY)
  const [variables, setVariables] = useState('')
  const [headersRaw, setHeadersRaw] = useState('')
  const [resp, setResp] = useState<GraphqlResponse | null>(null)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSend(input: GraphqlTestInput): Promise<void> {
    setPending(true)
    setError('')
    setResp(null)
    try {
      const r = await sendGraphql({
        endpoint: input.text,
        query,
        variables,
        headers: parseHeaders(headersRaw),
      })
      setResp(r)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setPending(false)
    }
  }

  return (
    <MultiPanel<GraphqlTestInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: 'https://api.example.com/graphql' }}
      initialOptions={{}}
      example={{ text: 'https://countries.trevorblades.com/' }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="flex items-center justify-between text-slate-600 dark:text-slate-400">
              查询语句
              <button
                type="button"
                data-testid="gql-introspect"
                onClick={() => setQuery(INTROSPECTION_QUERY)}
                className="rounded border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-600"
              >
                填入内省查询
              </button>
            </span>
            <textarea
              data-testid="gql-query"
              rows={8}
              className={INPUT_CLS}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">变量（JSON，可空）</span>
            <textarea
              data-testid="gql-variables"
              rows={2}
              className={INPUT_CLS}
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600 dark:text-slate-400">请求头（每行 Key: Value）</span>
            <textarea
              data-testid="gql-headers"
              rows={2}
              className={INPUT_CLS}
              value={headersRaw}
              onChange={(e) => setHeadersRaw(e.target.value)}
            />
          </label>
          <button
            type="button"
            data-testid="gql-send"
            disabled={pending}
            onClick={() => void handleSend(input)}
            className="w-fit rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500"
          >
            {pending ? '发送中…' : '发送查询'}
          </button>
          {error !== '' && (
            <p data-testid="gql-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {resp !== null && (
            <div data-testid="gql-result" className="flex flex-col gap-2">
              {resp.error !== undefined ? (
                <p className="text-sm text-red-600 dark:text-red-400">{resp.error}</p>
              ) : (
                <>
                  <p
                    className={`text-sm font-medium ${resp.ok ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    {resp.ok ? '成功' : '失败'}：HTTP {resp.status}，耗时 {resp.durationMs}ms
                  </p>
                  {resp.errors !== undefined && (
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">errors</p>
                      <pre
                        data-testid="gql-errors"
                        className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-2 font-mono text-sm dark:border-red-900 dark:bg-red-950"
                      >
                        {JSON.stringify(resp.errors, null, 2)}
                      </pre>
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">data</p>
                    <pre
                      data-testid="gql-data"
                      className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      {resp.data === undefined ? '(无)' : JSON.stringify(resp.data, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：请求在浏览器内发起，目标服务器需允许 CORS，否则浏览器会拦截响应。
          </p>
        </div>
      )}
      toText={() => (resp === null ? '' : formatGraphqlResult(resp))}
    />
  )
}
