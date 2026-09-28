import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { MODES } from './schema'
import {
  LinkCheckError,
  checkLinks,
  extractLinks,
  fetchPageHtml,
  renderReport,
  summarize,
  validateUrl,
} from './utils'
import type { LinkCheckInput, LinkCheckOptions } from './schema'
import type { LinkCheckResult, PageLink } from './utils'

const EXAMPLE: LinkCheckInput = {
  text: [
    '<a href="/about">关于我们</a>',
    '<a href="https://example.com/contact">联系</a>',
    '<a href="mailto:hi@example.com">邮件</a>',
    '<a href="#top">回顶部</a>',
  ].join('\n'),
  baseUrl: 'https://example.com/',
}

function statusBadge(status: LinkCheckResult['status']): string {
  switch (status) {
    case '正常':
      return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
    case '重定向':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
    case '死链':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
    case '超时':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
    case '错误':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
  }
}

/** D 类：浏览器 fetch 直连目标站点，无后端、无 Key */
export default function Tool() {
  const [links, setLinks] = useState<readonly PageLink[] | null>(null)
  const [results, setResults] = useState<readonly LinkCheckResult[] | null>(null)
  const [progress, setProgress] = useState<[number, number] | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const optionDefs: readonly OptionDef<LinkCheckOptions>[] = [
    { key: 'mode', label: '输入模式', kind: 'select', values: [...MODES] },
  ]

  function toChineseError(err: unknown): string {
    return err instanceof Error ? err.message : '操作失败，请重试'
  }

  async function handleExtract(input: LinkCheckInput, options: LinkCheckOptions): Promise<void> {
    setError('')
    setLinks(null)
    setResults(null)
    setProgress(null)
    try {
      if (input.text.trim() === '') throw new LinkCheckError('请输入页面 URL 或 HTML 源码')
      if (input.text.length > 200000) throw new LinkCheckError('输入超过 200,000 字符上限')
      let html: string
      let base: string
      if (options.mode === '抓取页面') {
        base = validateUrl(input.text)
        html = await fetchPageHtml(base)
      } else {
        if (input.baseUrl.trim() === '')
          throw new LinkCheckError('粘贴HTML 模式需要填写基准 URL（用于解析相对链接）')
        base = validateUrl(input.baseUrl)
        html = input.text
      }
      const found = extractLinks(html, base)
      if (found.length === 0) throw new LinkCheckError('未在页面中找到任何链接（<a> 标签）')
      setLinks(found)
    } catch (err) {
      setError(toChineseError(err))
    }
  }

  async function handleCheck(): Promise<void> {
    if (links === null || pending) return
    setError('')
    setResults(null)
    setPending(true)
    try {
      const checked = await checkLinks(links, undefined, {
        concurrency: 5,
        onProgress: (done, total) => setProgress([done, total]),
      })
      setResults(checked)
    } catch (err) {
      setError(toChineseError(err))
    } finally {
      setPending(false)
      setProgress(null)
    }
  }

  const summary = results === null ? null : summarize(results)

  return (
    <MultiPanel<LinkCheckInput, LinkCheckOptions>
      meta={meta}
      initialInput={{ text: '', baseUrl: '' }}
      initialOptions={{ mode: '粘贴HTML' }}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'baseUrl', label: '基准 URL（粘贴HTML 模式必填，用于解析相对链接）', rows: 1 },
      ]}
      example={EXAMPLE}
      renderOutput={(input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="extract"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending}
              onClick={() => void handleExtract(input, options)}
            >
              提取链接
            </button>
            <button
              type="button"
              data-testid="check"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
              disabled={pending || links === null}
              onClick={() => void handleCheck()}
            >
              {pending ? '检测中…' : '开始检测'}
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            抓取页面模式用浏览器 fetch 直接请求目标页面（目标须允许跨域，否则请用粘贴HTML）；
            检测时对每个链接发 HEAD 请求（不支持时自动回退 GET），并发 5 个。
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
          {progress ? (
            <p data-testid="progress" className="text-sm text-slate-600 dark:text-slate-400">
              检测中… {progress[0]} / {progress[1]}
            </p>
          ) : null}
          {links ? (
            <p data-testid="link-count" className="text-sm text-slate-600 dark:text-slate-400">
              提取到 {links.length} 个链接
              {results === null ? '，点「开始检测」逐个检查状态' : ''}
            </p>
          ) : null}
          {summary ? (
            <p
              data-testid="summary"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              共 {summary.total} 个：正常 {summary.ok} 重定向 {summary.redirect} 死链 {summary.dead}
              超时 {summary.timeout} 错误 {summary.error} 跳过 {summary.skipped}
            </p>
          ) : null}
          {results ? (
            <ul data-testid="result-list" className="flex flex-col gap-1">
              {results.map((r) => (
                <li
                  key={r.url}
                  className="flex flex-wrap items-center gap-2 rounded border border-slate-200 p-1.5 text-xs dark:border-slate-700"
                >
                  <span className={`rounded px-1.5 py-0.5 font-medium ${statusBadge(r.status)}`}>
                    {r.status}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {r.category}
                  </span>
                  <span className="break-all font-mono text-slate-700 dark:text-slate-300">
                    {r.url}
                  </span>
                  {r.httpStatus !== null ? (
                    <span className="text-slate-500">HTTP {r.httpStatus}</span>
                  ) : (
                    <span className="text-slate-500">{r.note}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      toText={() => (results === null ? '' : renderReport(results))}
      downloadExt="md"
    />
  )
}
