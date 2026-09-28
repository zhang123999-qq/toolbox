import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { PostmanImportInput } from './schema'
import {
  DEFAULT_COLLECTION_JSON,
  formatRequestList,
  parsePostmanCollection,
  toAssertTask,
  type ImportedRequest,
  type ParseResult,
} from './utils'

function parse(input: PostmanImportInput): { result: ParseResult | null; error: string } {
  try {
    return { result: parsePostmanCollection(input.text), error: '' }
  } catch (err) {
    return { result: null, error: err instanceof Error ? err.message : '解析失败' }
  }
}

export default function Tool() {
  const [selected, setSelected] = useState(0)

  function detailOf(result: ParseResult): ImportedRequest | null {
    if (result.requests.length === 0) return null
    return result.requests[Math.min(selected, result.requests.length - 1)] as ImportedRequest
  }

  return (
    <MultiPanel<PostmanImportInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: DEFAULT_COLLECTION_JSON }}
      initialOptions={{}}
      example={{ text: DEFAULT_COLLECTION_JSON }}
      renderOutput={(input) => {
        const { result, error } = parse(input)
        if (error !== '') {
          return (
            <p data-testid="parse-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )
        }
        const r = result as ParseResult
        const detail = detailOf(r)
        const detailText =
          detail === null
            ? ''
            : [
                `[${detail.method}] ${detail.url}`,
                '请求头：',
                ...(() => {
                  const keys = Object.keys(detail.headers)
                  return keys.length === 0
                    ? ['  (无)']
                    : keys.map((k) => `  ${k}: ${detail.headers[k]}`)
                })(),
                `请求体：${detail.body === '' ? '(空)' : detail.body}`,
              ].join('\n')
        return (
          <div className="flex flex-col gap-3">
            <p data-testid="collection-summary" className="text-sm font-medium">
              集合：{r.collectionName}，共 {r.requests.length} 个请求
            </p>
            {r.requests.length > 0 && (
              <label className="flex items-center gap-1 text-sm">
                <span className="w-16 shrink-0 text-slate-600 dark:text-slate-400">选择请求</span>
                <select
                  data-testid="request-list"
                  className="w-full rounded border border-slate-300 px-2 py-1 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={String(Math.min(selected, r.requests.length - 1))}
                  onChange={(e) => setSelected(Number(e.target.value))}
                >
                  {r.requests.map((req, i) => (
                    <option key={i} value={String(i)}>
                      [{req.method}] {req.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {detail !== null && (
              <pre
                data-testid="request-detail"
                className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                {detailText}
              </pre>
            )}
            {detail !== null && (
              <div className="flex flex-col gap-1">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  导出为 HTTP 断言测试（#748）可用的断言任务 JSON：
                </p>
                <pre
                  data-testid="assert-task"
                  className="whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  {toAssertTask(detail)}
                </pre>
              </div>
            )}
          </div>
        )
      }}
      toText={(input) => {
        const { result, error } = parse(input)
        return error !== '' ? error : formatRequestList(result as ParseResult)
      }}
    />
  )
}
