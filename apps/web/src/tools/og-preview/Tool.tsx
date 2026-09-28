import { useState } from 'react'
import { meta } from './meta'
import { extractOgTags, fetchHtml, getMissingSuggestions, renderSummary, resolveUrl } from './utils'
import type { OgTags } from './utils'
import type { OgPreviewOptions } from './schema'

type Mode = OgPreviewOptions['mode']

const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>示例文章标题（title 回退演示）</title>
<meta name="description" content="这是一段示例 meta 描述，演示 description 回退。">
<meta property="og:title" content="示例 OG 标题：如何做好 SEO">
<meta property="og:description" content="示例 OG 描述：从零开始的完整指南，附实战清单。">
<meta property="og:image" content="https://example.com/cover.png">
<meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/posts/seo-guide">
<meta property="og:site_name" content="示例站点">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="示例 Twitter 标题">
<meta name="twitter:description" content="示例 Twitter 描述">
<meta name="twitter:image" content="https://example.com/cover.png">
<link rel="icon" href="https://example.com/favicon.ico">
</head>
<body><h1>Hello</h1></body>
</html>`

const INPUT_CLASS =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const LABEL_CLASS = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300'
const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const PRIMARY_BTN_CLASS =
  'rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
const MODE_BTN_ACTIVE =
  'rounded border border-brand bg-brand/10 px-3 py-1.5 text-sm font-medium text-brand dark:text-white'
const PRE_CLASS =
  'overflow-auto rounded border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-700 dark:bg-slate-950'
const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

/** 卡片配图：无图或加载失败时显示灰色占位，避免 broken 图标 */
function PreviewImage({ src, label }: { readonly src?: string; readonly label: string }) {
  const [broken, setBroken] = useState(false)
  if (!src || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-200 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        无 og:image
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={label}
      className="h-full w-full object-cover"
      onError={() => setBroken(true)}
    />
  )
}

/** 从 og:url 或抓取地址推导展示域名 */
function displayDomain(tags: OgTags, base: string): string {
  const raw = tags.url ?? base
  if (raw === '') return '（未知域名）'
  try {
    return new URL(raw).hostname
  } catch {
    return '（未知域名）'
  }
}

function CardTitle({ value }: { readonly value?: string }) {
  return (
    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
      {value ?? '（未设置标题）'}
    </p>
  )
}

function CardDesc({ value, className }: { readonly value?: string; readonly className?: string }) {
  return <p className={className}>{value ?? '（未设置描述）'}</p>
}

function Cards({ tags, base }: { readonly tags: OgTags; readonly base: string }) {
  const domain = displayDomain(tags, base)
  const image = tags.image ?? tags.twitterImage
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {/* X：小图左 / 文字右（summary 卡片风格） */}
      <article
        data-testid="card-x"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      >
        <p className="border-b border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800">
          X（Twitter）· 小图卡片
        </p>
        <div className="flex">
          <div className="h-24 w-24 shrink-0 sm:h-28 sm:w-28">
            <PreviewImage src={image} label="X 卡片配图" />
          </div>
          <div className="min-w-0 flex-1 p-3">
            <CardTitle value={tags.twitterTitle ?? tags.title} />
            <CardDesc
              value={tags.twitterDescription ?? tags.description}
              className="mt-1 text-xs text-slate-600 dark:text-slate-400"
            />
            <p className="mt-1 truncate text-xs text-slate-400">{domain}</p>
          </div>
        </div>
      </article>

      {/* Facebook：大图上 / 文字下 */}
      <article
        data-testid="card-fb"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      >
        <p className="border-b border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800">
          Facebook · 大图卡片
        </p>
        <div className="aspect-[1.91/1] w-full">
          <PreviewImage src={image} label="Facebook 卡片配图" />
        </div>
        <div className="bg-slate-100 p-3 dark:bg-slate-800">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {domain}
          </p>
          <CardTitle value={tags.title} />
          <CardDesc
            value={tags.description}
            className="mt-0.5 text-sm text-slate-600 dark:text-slate-400"
          />
        </div>
      </article>

      {/* LinkedIn：大图上 / 文字下，配色与圆角与 FB 区分 */}
      <article
        data-testid="card-li"
        className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
      >
        <p className="border-b border-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800">
          LinkedIn · 大图卡片
        </p>
        <div className="aspect-[1.91/1] w-full">
          <PreviewImage src={image} label="LinkedIn 卡片配图" />
        </div>
        <div className="border-t-2 border-sky-600 p-3">
          <CardTitle value={tags.title} />
          <p className="mt-0.5 text-sm text-sky-700 dark:text-sky-400">{domain}</p>
          <CardDesc
            value={tags.description}
            className="mt-0.5 text-sm text-slate-600 dark:text-slate-400"
          />
        </div>
      </article>
    </div>
  )
}

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function Tool() {
  const [mode, setMode] = useState<Mode>('fetch')
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState('')
  const [tags, setTags] = useState<OgTags | null>(null)
  const [baseUrl, setBaseUrl] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  async function handleRun(): Promise<void> {
    setPending(true)
    setError('')
    try {
      const trimmed = input.trim()
      if (trimmed === '') {
        throw new Error(
          mode === 'fetch' ? '请输入要抓取的页面 URL，例如 https://example.com' : '请粘贴页面 HTML',
        )
      }
      if (trimmed.length > 200000) throw new Error('输入超过 200,000 字符上限')
      let html: string
      let base = ''
      if (mode === 'fetch') {
        html = await fetchHtml(trimmed)
        base = trimmed
      } else {
        html = trimmed
      }
      const parsed = extractOgTags(html)
      if (base !== '') {
        if (parsed.image) parsed.image = resolveUrl(base, parsed.image)
        if (parsed.twitterImage) parsed.twitterImage = resolveUrl(base, parsed.twitterImage)
      }
      setTags(parsed)
      setBaseUrl(base)
      setSuggestions(getMissingSuggestions(parsed))
      setSummary(renderSummary(parsed))
    } catch (e) {
      setTags(null)
      setBaseUrl('')
      setSuggestions([])
      setSummary('')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setPending(false)
    }
  }

  function handleExample(): void {
    setMode('paste')
    setInput(EXAMPLE_HTML)
  }

  function handleClear(): void {
    setInput('')
    setError('')
    setSummary('')
    setTags(null)
    setBaseUrl('')
    setSuggestions([])
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {meta.description}（{meta.titleEn}）
      </p>

      <div className="flex gap-2" role="group" aria-label="输入模式">
        <button
          type="button"
          data-testid="mode-fetch"
          aria-pressed={mode === 'fetch'}
          className={mode === 'fetch' ? MODE_BTN_ACTIVE : BTN_CLASS}
          onClick={() => setMode('fetch')}
        >
          抓取 URL
        </button>
        <button
          type="button"
          data-testid="mode-paste"
          aria-pressed={mode === 'paste'}
          className={mode === 'paste' ? MODE_BTN_ACTIVE : BTN_CLASS}
          onClick={() => setMode('paste')}
        >
          粘贴 HTML
        </button>
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="og-preview-input">
          {mode === 'fetch' ? '页面 URL' : '页面 HTML'}
        </label>
        <textarea
          id="og-preview-input"
          data-testid="input"
          className={INPUT_CLASS + ' min-h-40 font-mono'}
          placeholder={mode === 'fetch' ? 'https://example.com/article' : '<html>\n<head>…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        {mode === 'fetch' && (
          <p className="mt-1 text-xs text-slate-400">
            浏览器直接抓取：目标站若未开放 CORS 会失败，届时改用「粘贴 HTML」模式。
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="run"
          className={PRIMARY_BTN_CLASS}
          disabled={pending}
          onClick={() => void handleRun()}
        >
          {pending ? '运行中…' : '运行'}
        </button>
        <button type="button" data-testid="example" className={BTN_CLASS} onClick={handleExample}>
          示例
        </button>
        <button type="button" data-testid="clear" className={BTN_CLASS} onClick={handleClear}>
          清空
        </button>
      </div>

      {error !== '' ? (
        <p role="alert" data-testid="output" className={ERROR_CLASS}>
          {error}
        </p>
      ) : (
        <div data-testid="output" className="flex flex-col gap-4">
          {tags === null ? (
            <p className="text-sm text-slate-400">
              {mode === 'fetch'
                ? '输入页面 URL 后点「运行」，在浏览器内直接抓取并解析 og 标签'
                : '粘贴页面 HTML 后点「运行」，解析 og 标签并预览分享卡片'}
            </p>
          ) : (
            <>
              <pre className={PRE_CLASS}>{summary}</pre>
              <Cards tags={tags} base={baseUrl} />
              {suggestions.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                    补充建议
                  </p>
                  <ul
                    data-testid="suggestions"
                    className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400"
                  >
                    {suggestions.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          data-testid="copy"
          className={BTN_CLASS}
          disabled={summary === ''}
          onClick={() => {
            void copyText(summary).then((ok) => {
              setCopied(ok)
              if (ok) setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          {copied ? '已复制' : '复制'}
        </button>
        <button
          type="button"
          data-testid="download"
          className={BTN_CLASS}
          disabled={summary === ''}
          onClick={() => downloadText('og-preview.txt', summary)}
        >
          下载
        </button>
      </div>
    </div>
  )
}
