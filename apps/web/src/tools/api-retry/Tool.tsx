import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ApiRetryInput } from './schema'
import {
  EXAMPLE_CONFIG,
  STRATEGY_TEXT,
  computeRetrySchedule,
  formatDelay,
  parseRetryConfig,
  totalWaitTime,
  type RetryStep,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'

export default function Tool() {
  const [steps, setSteps] = useState<RetryStep[]>([])
  const [error, setError] = useState('')

  function handleRun(input: ApiRetryInput): void {
    setError('')
    setSteps([])
    try {
      setSteps(computeRetrySchedule(parseRetryConfig(input.text)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ApiRetryInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_CONFIG, null, 2) }}
      initialOptions={{}}
      example={{ text: JSON.stringify({ ...EXAMPLE_CONFIG, strategy: 'linear' }, null, 2) }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="apiretry-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              计算时间表
            </button>
          </div>
          {error !== '' && (
            <p data-testid="apiretry-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {steps.length > 0 && (
            <div className="flex flex-col gap-2">
              <table data-testid="apiretry-table" className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-4 font-medium">次数</th>
                    <th className="py-1 pr-4 font-medium">等待</th>
                    <th className="py-1 pr-4 font-medium">抖动区间</th>
                    <th className="py-1 font-medium">累计</th>
                  </tr>
                </thead>
                <tbody>
                  {steps.map((s) => (
                    <tr key={s.attempt} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-1 pr-4 font-mono">{s.attempt}</td>
                      <td className="py-1 pr-4 font-mono">{formatDelay(s.delayMs)}</td>
                      <td className="py-1 pr-4 font-mono">
                        {formatDelay(s.minDelayMs)} ~ {formatDelay(s.maxDelayMs)}
                      </td>
                      <td className="py-1 font-mono">{formatDelay(s.cumulativeMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p data-testid="apiretry-total" className="text-sm text-slate-600 dark:text-slate-400">
                最坏总等待：{formatDelay(totalWaitTime(steps))}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：支持{Object.values(STRATEGY_TEXT).join(' / ')}三种策略；
            抖动为 ±50% 随机区间，实际等待为标称值；等待时间按 maxDelayMs 截断。
            纯本地计算，不涉及网络请求。
          </p>
        </div>
      )}
      toText={() => JSON.stringify(steps, null, 2)}
    />
  )
}
