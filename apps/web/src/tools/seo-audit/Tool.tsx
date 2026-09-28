import { useState } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { inputSchema, optionsSchema } from './schema'
import type { AuditResult, CheckStatus } from './utils'
import { auditHtml, fetchHtml, renderResult } from './utils'

type Mode = 'fetch' | 'paste'

const EXAMPLE_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>示例网站 - SEO 审计演示页面</title>
<meta name="description" content="这是一个用于演示 SEO 审计工具的示例页面，包含标题、描述与社交分享标签。">
<link rel="canonical" href="https://example.com/">
<meta property="og:title" content="示例网站">
<meta property="og:description" content="示例描述">
<meta property="og:image" content="https://example.com/og.png">
<meta name="twitter:card" content="summary">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script type="application/ld+json">{"@context":"https://schema.org"}</script>
</head>
<body>
<h1>示例主标题</h1>
<img src="a.png" alt="示例图片">
</body>
</html>`

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

const BADGE_CLASS: Record<CheckStatus, string> = {
  '通过': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  '警告': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  '问题': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

function badge(status: CheckStatus) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap ${BADGE_CLASS[status]}`}>
      {status}
    </span>
  )
}

export default function Tool() {
  const t = useTranslate()
  const [mode, setMode] = useState<Mode>('fetch')
  const [text, setText] = useState('')
  const [result, setResult] = useState<AuditResult | null>(null)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function run() {
    setPending(true)
    setError('')
    try {
      const parsed = inputSchema.parse({ text })
      const opts = optionsSchema.parse({ mode })
      const trimmed = parsed.text.trim()
      if (trimmed === '') throw new Error('请输入要审计的页面 URL，或粘贴 HTML 源码')
      let html = parsed.text
      let url: string | undefined
      if (opts.mode === 'fetch') {
        url = trimmed
        html = await fetchHtml(url)
      }
      const r = auditHtml(html, url)
      setResult(r)
      setReport(renderResult(r))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setResult(null)
      setReport('')
    } finally {
      setPending(false)
    }
  }

  function useExample() {
    setMode('paste')
    setText(EXAMPLE_HTML)
    setResult(null)
    setReport('')
    setError('')
  }

  function clear() {
    setText('')
    setResult(null)
    setReport('')
    setError('')
  }

  async function copy() {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  }

  function download() {
    if (!report) return
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${meta.slug}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-4 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="seo-audit-mode"
              checked={mode === 'fetch'}
              onChange={() => setMode('fetch')}
            />
            实时抓取
          </label>
          <label className="flex items-center gap-1">
            <input
              type="radio"
              name="seo-audit-mode"
              checked={mode === 'paste'}
              onChange={() => setMode('paste')}
            />
            粘贴 HTML
          </label>
        </div>
        <label
          htmlFor="tool-input"
          className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {mode === 'fetch' ? '页面 URL' : t('tool.input')}
        </label>
        <textarea
          id="tool-input"
          data-testid="input"
          className="min-h-64 w-full flex-1 resize-y rounded border border-slate-200 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder={mode === 'fetch' ? 'https://example.com' : '在此粘贴页面的 HTML 源码…'}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {mode === 'fetch'
            ? '浏览器直接抓取目标页面；跨域目标若未开放 CORS 会失败，此时改用「粘贴 HTML」模式'
            : '把浏览器「查看网页源代码」的内容完整粘贴进来'}
        </p>
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            disabled={pending}
            onClick={run}
          >
            {pending ? t('tool.running') : t('tool.run')}
          </button>
          <button type="button" data-testid="example" className={SECONDARY_BUTTON} onClick={useExample}>
            {t('tool.example')}
          </button>
          <button type="button" data-testid="clear" className={SECONDARY_BUTTON} onClick={clear}>
            {t('tool.clear')}
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <span className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('tool.output')}
        </span>
        <div
          data-testid="output"
          className="min-h-64 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
        >
          {error !== '' ? (
            <p role="alert" className={ERROR_CLASS}>
              {error}
            </p>
          ) : result === null ? (
            <p className="text-slate-500 dark:text-slate-400">
              {mode === 'fetch'
                ? '输入页面 URL 后点「运行」，在浏览器内抓取并审计'
                : '粘贴 HTML 源码后点「运行」，在浏览器内做 11 项 SEO 审计'}
            </p>
          ) : (
            <div>
              <p className="mb-2 text-lg font-semibold">
                总分：{result.score}/100
              </p>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.check} className="border-t border-slate-200 dark:border-slate-800">
                      <td className="py-1 pr-2 align-top">{badge(item.status)}</td>
                      <td className="py-1 align-top">
                        <span className="font-medium">{item.check}</span>
                        <span className="text-slate-600 dark:text-slate-400">：{item.detail}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="copy"
            className={SECONDARY_BUTTON}
            disabled={report === ''}
            onClick={copy}
          >
            {t('tool.copy')}
          </button>
          <button
            type="button"
            data-testid="download"
            className={SECONDARY_BUTTON}
            disabled={report === ''}
            onClick={download}
          >
            {t('tool.download')}
          </button>
        </div>
      </div>
    </section>
  )
}
