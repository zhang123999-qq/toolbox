import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ApiCacheInput } from './schema'
import {
  DECISION_TEXT,
  EXAMPLE_INPUT,
  evaluateCache,
  parseCacheInput,
  type CacheResult,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'
const PRE_CLS =
  'max-h-64 overflow-auto rounded bg-slate-50 p-3 font-mono text-xs break-all whitespace-pre-wrap dark:bg-slate-900'

export default function Tool() {
  const [result, setResult] = useState<CacheResult | null>(null)
  const [error, setError] = useState('')

  function handleRun(input: ApiCacheInput): void {
    setError('')
    setResult(null)
    try {
      setResult(evaluateCache(parseCacheInput(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ApiCacheInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ cacheControl: 'no-store' }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="apicache-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              分析缓存
            </button>
          </div>
          {error !== '' && (
            <p data-testid="apicache-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {result && (
            <div className="flex flex-col gap-2">
              <p data-testid="apicache-decision" className="text-base font-medium">
                决策：{DECISION_TEXT[result.decision]}
              </p>
              <p
                data-testid="apicache-reason"
                className="text-sm text-slate-600 dark:text-slate-400"
              >
                {result.reason}
              </p>
              {result.decision === 'fresh' && (
                <p className="font-mono text-sm">剩余 TTL：{(result.ttlMs / 1000).toFixed(0)} 秒</p>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500">解析出的指令</summary>
                <pre className={PRE_CLS}>{JSON.stringify(result.directives, null, 2)}</pre>
              </details>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：按 s-maxage &gt; max-age &gt; Expires 优先级判断新鲜度； no-store
            直接判禁止缓存；过期资源给出条件请求建议。纯本地计算。
          </p>
        </div>
      )}
      toText={() => (result ? DECISION_TEXT[result.decision] + '：' + result.reason : '')}
    />
  )
}
