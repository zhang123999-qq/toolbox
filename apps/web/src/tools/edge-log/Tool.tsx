import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { EdgeLogInput, EdgeLogOptions } from './schema'
import { buildGraphqlQuery, buildLogQuery, EXAMPLE_LOG_LINE, parseLogLines } from './utils'

interface LogView {
  error: string
  code: string
  detail: string
}

function buildView(input: EdgeLogInput, options: EdgeLogOptions): LogView {
  try {
    if (options.mode === 'parse') {
      const text = input.text.trim() === '' ? EXAMPLE_LOG_LINE : input.text
      const parsed = parseLogLines(text)
      const detail = parsed
        .map(
          (line, index) =>
            `#${index + 1} ${line.method} ${line.path} → ${line.status}（${line.ip}，${line.time}）`,
        )
        .join('\n')
      return { error: '', code: '', detail }
    }
    const query = buildLogQuery({
      startTime: options.startTime,
      endTime: options.endTime,
      status: options.status,
      colo: options.colo,
    })
    const code = buildGraphqlQuery(query)
    const detail =
      `时间范围：${query.start} ~ ${query.end}` +
      (query.filter === '' ? '\n无过滤条件' : `\n过滤：${query.filter}`)
    return { error: '', code, detail }
  } catch (err) {
    return { error: err instanceof Error ? err.message : '处理失败', code: '', detail: '' }
  }
}

export default function Tool() {
  return (
    <MultiPanel<EdgeLogInput, EdgeLogOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_LOG_LINE }}
      initialOptions={{
        mode: 'query',
        startTime: '2026-09-28T00:00:00+08:00',
        endTime: '2026-09-28T01:00:00+08:00',
        status: '',
        colo: '',
      }}
      example={{ text: EXAMPLE_LOG_LINE }}
      optionDefs={[
        { key: 'mode', label: '模式', kind: 'select', values: ['query', 'parse'] },
        { key: 'startTime', label: '开始时间', kind: 'text' },
        { key: 'endTime', label: '结束时间', kind: 'text' },
        { key: 'status', label: '状态码', kind: 'text' },
        { key: 'colo', label: '节点', kind: 'text' },
      ]}
      renderOutput={(input, options) => {
        const view = buildView(input, options)
        return (
          <div className="flex flex-col gap-3">
            {view.error !== '' && (
              <p data-testid="edge-log-error" className="text-sm text-red-600 dark:text-red-400">
                {view.error}
              </p>
            )}
            {view.code !== '' && (
              <pre
                data-testid="edge-log-code"
                className="whitespace-pre-wrap rounded bg-slate-100 p-3 font-mono text-xs dark:bg-slate-900"
              >
                {view.code}
              </pre>
            )}
            {view.detail !== '' && (
              <p
                data-testid="edge-log-detail"
                className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300"
              >
                {view.detail}
              </p>
            )}
          </div>
        )
      }}
      toText={(input, options) => {
        const view = buildView(input, options)
        return view.code !== '' ? view.code : view.detail
      }}
      downloadExt="graphql"
    />
  )
}
