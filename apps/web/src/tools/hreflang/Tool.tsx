import { useState } from 'react'
import { meta } from './meta'
import { buildHreflangTags, LANGUAGES } from './utils'
import type { HreflangEntry } from './utils'

const INPUT_CLASS =
  'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100'
const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

const EXAMPLE: readonly HreflangEntry[] = [
  { lang: 'en', url: 'https://example.com/en/' },
  { lang: 'zh-CN', url: 'https://example.com/zh/' },
]

function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/html;charset=utf-8' })
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
  const [entries, setEntries] = useState<readonly HreflangEntry[]>([{ lang: 'en', url: '' }])
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const update = (index: number, patch: Partial<HreflangEntry>) => {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)))
  }

  const run = (list: readonly HreflangEntry[]) => {
    try {
      setOutput(buildHreflangTags(list))
      setError('')
    } catch (e) {
      setOutput('')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="input">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {meta.description}（{meta.titleEn}）
      </p>

      <div className="flex flex-col gap-2">
        {entries.map((e, i) => (
          <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              data-testid={`lang-${i}`}
              aria-label={`第 ${i + 1} 条语言代码`}
              className={INPUT_CLASS + ' sm:w-40'}
              value={e.lang}
              onChange={(ev) => update(i, { lang: ev.target.value })}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <input
              data-testid={`url-${i}`}
              aria-label={`第 ${i + 1} 条 URL`}
              className={INPUT_CLASS + ' font-mono'}
              placeholder="https://example.com/en/"
              value={e.url}
              onChange={(ev) => update(i, { url: ev.target.value })}
            />
            <button
              type="button"
              data-testid={`remove-${i}`}
              aria-label={`删除第 ${i + 1} 条`}
              className={BTN_CLASS + ' shrink-0'}
              onClick={() => setEntries((prev) => prev.filter((_, j) => j !== i))}
            >
              删除
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="add"
          className={BTN_CLASS}
          onClick={() => setEntries((prev) => [...prev, { lang: 'en', url: '' }])}
        >
          添加一条
        </button>
        <button type="button" data-testid="run" className={BTN_CLASS} onClick={() => run(entries)}>
          生成
        </button>
        <button
          type="button"
          data-testid="example"
          className={BTN_CLASS}
          onClick={() => {
            setEntries(EXAMPLE)
            run(EXAMPLE)
          }}
        >
          示例
        </button>
        <button
          type="button"
          data-testid="clear"
          className={BTN_CLASS}
          onClick={() => {
            setEntries([{ lang: 'en', url: '' }])
            setOutput('')
            setError('')
          }}
        >
          清空
        </button>
      </div>

      {error !== '' && (
        <p
          role="alert"
          data-testid="output"
          className="rounded border border-red-200 bg-red-50 p-3 font-mono text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </p>
      )}
      {error === '' && output !== '' && (
        <div className="flex flex-col gap-2">
          <pre
            data-testid="output"
            className="overflow-auto rounded border border-slate-200 bg-slate-50 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            {output}
          </pre>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="copy"
              className={BTN_CLASS}
              onClick={() => {
                void copyText(output).then((ok) => {
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
              onClick={() => downloadText('hreflang.html', output)}
            >
              下载
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
