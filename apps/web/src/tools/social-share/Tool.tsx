import { useState } from 'react'
import { meta } from './meta'
import { assertShareUrl, buildShareLinks, PLATFORMS, renderLinks } from './utils'
import type { PlatformId } from './utils'

const INPUT_CLASS =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const PRIMARY_BTN = 'rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90'

const EXAMPLE_URL = 'https://example.com/article'
const EXAMPLE_TITLE = '示例文章标题'

interface ShareRow {
  readonly id: PlatformId
  readonly name: string
  readonly link: string
}

type CopyResult = 'ok' | 'fallback' | 'failed'

/**
 * 复制文本：先走 Clipboard API，失败（非安全上下文等）回退到
 * 隐藏 textarea + document.execCommand('copy') 方案。
 */
async function copyText(text: string): Promise<CopyResult> {
  try {
    await navigator.clipboard.writeText(text)
    return 'ok'
  } catch {
    // 回退方案
  }
  let ta: HTMLTextAreaElement | null = null
  try {
    ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    return ok ? 'fallback' : 'failed'
  } catch {
    return 'failed'
  } finally {
    if (ta) document.body.removeChild(ta)
  }
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

export default function Tool() {
  const [url, setUrl] = useState('')
  const [shareTitle, setShareTitle] = useState('')
  const [shareText, setShareText] = useState('')
  const [rows, setRows] = useState<readonly ShareRow[]>([])
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  function run() {
    setNote('')
    setCopiedId(null)
    try {
      const clean = assertShareUrl(url)
      const links = buildShareLinks({ url: clean, title: shareTitle, text: shareText })
      setRows(PLATFORMS.map((p) => ({ id: p.id, name: p.name, link: links[p.id] })))
      setOutput(renderLinks(links))
      setError('')
    } catch (e) {
      setRows([])
      setOutput('')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function fillExample() {
    setUrl(EXAMPLE_URL)
    setShareTitle(EXAMPLE_TITLE)
    setShareText('')
    setNote('')
  }

  function clearAll() {
    setUrl('')
    setShareTitle('')
    setShareText('')
    setRows([])
    setOutput('')
    setError('')
    setCopiedId(null)
    setNote('')
  }

  function markCopied(id: string, result: CopyResult): void {
    if (result === 'failed') {
      setNote('复制失败：浏览器不允许自动复制，请手动选中链接复制')
      return
    }
    setCopiedId(id)
    if (result === 'fallback') setNote('已通过兼容方式复制到剪贴板')
    setTimeout(() => {
      setCopiedId(null)
      setNote('')
    }, 1500)
  }

  function copyOne(row: ShareRow): void {
    void copyText(row.link).then((result) => markCopied(row.id, result))
  }

  function copyAll(): void {
    if (output === '') return
    void copyText(output).then((result) => markCopied('all', result))
  }

  function download(): void {
    if (output === '') return
    downloadText(`${meta.slug}.txt`, output)
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {meta.description}（{meta.titleEn}）
      </p>

      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">要分享的 URL</span>
          <input
            type="text"
            data-testid="input"
            className={INPUT_CLASS + ' font-mono'}
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">分享标题（可选）</span>
          <input
            type="text"
            data-testid="option-shareTitle"
            className={INPUT_CLASS}
            placeholder="文章标题，会拼进支持标题的平台"
            value={shareTitle}
            onChange={(e) => setShareTitle(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">分享摘要（可选）</span>
          <textarea
            data-testid="option-shareText"
            rows={2}
            className={INPUT_CLASS + ' resize-y'}
            placeholder="一句话摘要，会拼进 Telegram / 邮件正文"
            value={shareText}
            onChange={(e) => setShareText(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" data-testid="run" className={PRIMARY_BTN} onClick={run}>
          生成分享链接
        </button>
        <button type="button" data-testid="example" className={BTN_CLASS} onClick={fillExample}>
          示例
        </button>
        <button type="button" data-testid="clear" className={BTN_CLASS} onClick={clearAll}>
          清空
        </button>
      </div>

      {error !== '' ? (
        <p
          role="alert"
          data-testid="output"
          className="rounded border border-red-200 bg-red-50 p-3 font-mono text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      ) : (
        <pre
          data-testid="output"
          className="min-h-24 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        >
          {output === '' ? '输入 URL 后点「生成分享链接」，8 个平台的分享链接会显示在这里' : output}
        </pre>
      )}

      {rows.length > 0 && (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded border border-slate-200 p-2 sm:flex-row sm:items-center dark:border-slate-700"
            >
              <span className="w-24 shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {row.name}
              </span>
              <input
                type="text"
                readOnly
                aria-label={`${row.name} 分享链接`}
                className={INPUT_CLASS + ' flex-1 font-mono text-xs'}
                value={row.link}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                data-testid={'copy-' + row.id}
                className={BTN_CLASS + ' shrink-0'}
                onClick={() => copyOne(row)}
              >
                {copiedId === row.id ? '已复制' : '复制'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" data-testid="copy" className={BTN_CLASS} onClick={copyAll}>
          {copiedId === 'all' ? '已复制' : '复制全部'}
        </button>
        <button type="button" data-testid="download" className={BTN_CLASS} onClick={download}>
          下载 .txt
        </button>
        {note !== '' && (
          <span data-testid="note" className="text-sm text-slate-500 dark:text-slate-400">
            {note}
          </span>
        )}
      </div>
    </div>
  )
}
