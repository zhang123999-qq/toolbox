import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { ApiLogInput } from './schema'
import { EXAMPLE_LOG, analyzeLogs, parseAccessLog, type LogStats } from './utils'

const BTN_CLS =
  'rounded bg-blue-600 px-4 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-blue-500'

export default function Tool() {
  const [stats, setStats] = useState<LogStats | null>(null)
  const [skipped, setSkipped] = useState(0)
  const [error, setError] = useState('')

  function handleRun(input: ApiLogInput): void {
    setError('')
    setStats(null)
    setSkipped(0)
    try {
      const { entries, skipped: sk } = parseAccessLog(input.text)
      if (entries.length === 0 && input.text.trim() !== '') {
        setError('未解析出任何有效日志行' + (sk > 0 ? '，跳过 ' + sk + ' 行' : ''))
        return
      }
      setSkipped(sk)
      setStats(analyzeLogs(entries))
    } catch (err) {
      setError(err instanceof Error ? err.message : '执行失败')
    }
  }

  return (
    <MultiPanel<ApiLogInput, Record<string, never>>
      meta={meta}
      initialInput={{ text: EXAMPLE_LOG }}
      initialOptions={{}}
      example={{ text: EXAMPLE_LOG }}
      renderOutput={(input) => (
        <div className="flex flex-col gap-3">
          <div>
            <button
              type="button"
              data-testid="apilog-run"
              onClick={() => handleRun(input)}
              className={BTN_CLS}
            >
              分析日志
            </button>
          </div>
          {error !== '' && (
            <p data-testid="apilog-error" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          {stats && (
            <div className="flex flex-col gap-2 text-sm">
              <p data-testid="apilog-summary">
                共 {stats.total} 条{skipped > 0 ? '（跳过 ' + skipped + ' 行非法）' : ''}｜错误率{' '}
                {(stats.errorRate * 100).toFixed(1)}%
                {stats.peakHour
                  ? '｜峰值小时 ' + stats.peakHour.hour + '（' + stats.peakHour.count + ' 条）'
                  : ''}
              </p>
              <p data-testid="apilog-status">
                状态码分布：
                {Object.entries(stats.statusDist)
                  .map(([k, v]) => k + ': ' + v)
                  .join('，')}
              </p>
              <table data-testid="apilog-table" className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="py-1 pr-4 font-medium">路径</th>
                    <th className="py-1 pr-4 font-medium">次数</th>
                    <th className="py-1 pr-4 font-medium">平均耗时</th>
                    <th className="py-1 font-medium">5xx</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topPaths.map((p) => (
                    <tr key={p.path} className="border-t border-slate-200 dark:border-slate-700">
                      <td className="py-1 pr-4 font-mono break-all">{p.path}</td>
                      <td className="py-1 pr-4 font-mono">{p.count}</td>
                      <td className="py-1 pr-4 font-mono">
                        {p.avgMs === null ? '—' : p.avgMs + 'ms'}
                      </td>
                      <td className="py-1 font-mono">{p.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!stats.hasTiming && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  日志中无耗时字段，平均耗时列为空（nginx 可追加 $request_time）。
                </p>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            说明：解析 Apache / Nginx combined 格式；尾部可选 request_time（秒）作为耗时；
            非法行自动跳过并计数。纯本地计算，日志不上传。
          </p>
        </div>
      )}
      toText={() =>
        stats
          ? '共 ' +
            stats.total +
            ' 条，错误率 ' +
            (stats.errorRate * 100).toFixed(1) +
            '%\n' +
            stats.topPaths.map((p) => p.path + ' x' + p.count).join('\n')
          : ''
      }
    />
  )
}
