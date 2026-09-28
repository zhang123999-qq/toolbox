import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildSuggestions, checkFavicon, parseIconLinks, renderReport, sourceLabel } from './utils'
import type { CheckResult, IconLink } from './utils'
import type { FaviconCheckInput, FaviconCheckOptions } from './schema'

const EXAMPLE: FaviconCheckInput = { text: 'https://example.com' }

const TH = 'border-b border-slate-200 px-2 py-1 text-left font-medium dark:border-slate-700'
const TD = 'border-b border-slate-100 px-2 py-1 align-top dark:border-slate-800'

/**
 * 检查面板：点「开始检查」后用浏览器 fetch 逐个检查候选地址。
 * fetch 经 globalThis.fetch 注入（测试时用 vi.stubGlobal mock）。
 */
function Checker({
  url,
  html,
  onDone,
}: {
  url: string
  html: string
  onDone: (report: string) => void
}) {
  const [results, setResults] = useState<CheckResult[] | null>(null)
  const [icons, setIcons] = useState<IconLink[]>([])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleCheck(): Promise<void> {
    setError('')
    setPending(true)
    try {
      const checked = await checkFavicon(url, html, globalThis.fetch)
      const parsed = parseIconLinks(html, url.trim())
      setResults(checked)
      setIcons(parsed)
      onDone(renderReport(checked, parsed, { htmlProvided: html.trim() !== '' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '检查失败，请重试')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          type="button"
          data-testid="check"
          className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
          disabled={pending}
          onClick={() => void handleCheck()}
        >
          {pending ? '检查中…' : '开始检查'}
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        先对每个候选地址发 HEAD 请求（15 秒超时），405 / 501 时回退 GET。 跨域站点的 HEAD 可能被
        CORS 拦截导致误报失败，请结合声明清单判断。
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
      {results ? (
        <div className="flex flex-col gap-3">
          <table data-testid="result-table" className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 dark:text-slate-400">
                <th className={TH}>地址</th>
                <th className={TH}>来源</th>
                <th className={TH}>状态码</th>
                <th className={TH}>Content-Type</th>
                <th className={TH}>结果</th>
                <th className={TH}>备注</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.url}>
                  <td className={`${TD} break-all font-mono`}>{r.url}</td>
                  <td className={`${TD} break-all font-mono`}>{sourceLabel(r.url, icons)}</td>
                  <td className={TD}>{r.status ?? '—'}</td>
                  <td className={`${TD} break-all font-mono`}>{r.contentType ?? '—'}</td>
                  <td className={TD}>
                    {r.ok ? (
                      <span className="rounded border border-green-300 bg-green-50 px-1.5 py-0.5 font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                        OK
                      </span>
                    ) : (
                      <span className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 font-medium text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                        失败
                      </span>
                    )}
                  </td>
                  <td className={TD}>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div
            data-testid="suggestions"
            className="rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
          >
            <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">建议</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
              {buildSuggestions(results, icons).map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default function Tool() {
  // 复制 / 下载用：检查完成后由 Checker 回填纯文本报告
  const [report, setReport] = useState('')
  const optionDefs: readonly OptionDef<FaviconCheckOptions>[] = [
    {
      key: 'html',
      label: '页面 HTML（可选）',
      kind: 'textarea',
      placeholder:
        '粘贴该页面的 HTML 源码，用于解析 <link rel="icon"> 等声明；留空则只检查默认地址',
    },
  ]

  return (
    <MultiPanel<FaviconCheckInput, FaviconCheckOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ html: '' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => (
        <Checker url={input.text} html={options.html} onDone={setReport} />
      )}
      toText={() => report}
      downloadExt="txt"
    />
  )
}
