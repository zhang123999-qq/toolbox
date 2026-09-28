import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ApiRateInput } from './schema'
import {
  EXAMPLE_INPUT,
  RATE_MODE_TEXT,
  parseRateSimInput,
  simulateSlidingWindow,
  simulateTokenBucket,
  type SlidingWindowResult,
  type TokenBucketResult,
} from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'

type Row = { time: number; allowed: boolean; extra: string }

export default function Tool() {
  const [rows, setRows] = useState<Row[]>([])
  const [modeText, setModeText] = useState('')
  const [error, setError] = useState('')

  function handleRun(input: ApiRateInput): void {
    setError('')
    setRows([])
    setModeText('')
    try {
      const cfg = parseRateSimInput(input.text)
      setModeText(RATE_MODE_TEXT[cfg.mode])
      if (cfg.mode === 'token-bucket') {
        const out: TokenBucketResult[] = simulateTokenBucket(cfg.requests, {
          capacity: cfg.capacity,
          refillPerSec: cfg.refillPerSec,
        })
        setRows(
          out.map((r) => ({ time: r.time, allowed: r.allowed, extra: '剩余令牌 ' + r.tokensLeft })),
        )
      } else {
        const out: SlidingWindowResult[] = simulateSlidingWindow(cfg.requests, {
          limit: cfg.limit,
          windowSec: cfg.windowSec,
        })
        setRows(
          out.map((r) => ({
            time: r.time,
            allowed: r.allowed,
            extra: '窗口内 ' + r.countInWindow,
          })),
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  const allowedCount = rows.filter((r) => r.allowed).length

  return (
    <MultiPanel<ApiRateInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: JSON.stringify(EXAMPLE_INPUT, null, 2) }}
      initialOptions={{}}
      example={{
        text: JSON.stringify({ ...EXAMPLE_INPUT, mode: 'sliding-window' }, null, 2),
      }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="apirate-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              模拟限流
            </button>
          </div>
          {error !== '' && (
            <p data-testid="apirate-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <p data-testid="apirate-summary" className="text-sm">
                模式：{modeText}｜放行 {allowedCount} / {rows.length}
              </p>
              <table data-testid="apirate-table" className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-4 font-medium">时间（秒）</th>
                    <th className="py-1 pr-4 font-medium">结果</th>
                    <th className="py-1 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-1 pr-4 font-mono">{r.time}</td>
                      <td className="py-1 pr-4">
                        <span
                          className={
                            r.allowed
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {r.allowed ? '放行' : '拒绝'}
                        </span>
                      </td>
                      <td className="py-1 font-mono text-xs">{r.extra}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：令牌桶按补充速率恢复令牌；滑动窗口统计窗口内已放行请求数，
            被拒绝的请求不占名额。时间戳为相对秒数。纯本地计算。
          </p>
        </div>
      )}
      toText={() =>
        rows.map((r) => `${r.time}s ${r.allowed ? '放行' : '拒绝'} ${r.extra}`).join('\n')
      }
    />
  )
}
