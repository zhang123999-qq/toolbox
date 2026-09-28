import { useMemo, useState } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { analyzeBidi, formatBidi } from './utils'

/** 示例：中英阿混合 */
const EXAMPLE = 'Hello مرحبا 世界'

const PANEL =
  'rounded border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950'

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function Tool() {
  const [text, setText] = useState('')
  const [nonce, setNonce] = useState(0)

  const display = text.trim() === '' ? EXAMPLE : text
  const result = useMemo(() => {
    try {
      const a = analyzeBidi(display)
      return { ok: true as const, value: formatBidi(a) }
    } catch (e) {
      return { ok: false as const, value: e instanceof Error ? e.message : String(e) }
    }
    // nonce 用于「运行」按钮强制重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, nonce])

  async function copy() {
    if (!result.ok) return
    try {
      await navigator.clipboard.writeText(result.value)
    } catch {
      /* 剪贴板不可用时静默 */
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <label
            htmlFor="tool-input"
            className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            输入文本
          </label>
          <textarea
            id="tool-input"
            data-testid="input"
            className="min-h-40 w-full flex-1 resize-y rounded border border-slate-200 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="输入要分析的文本…"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="tool-actions mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="run"
              className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
              onClick={() => setNonce((n) => n + 1)}
            >
              运行
            </button>
            <button
              type="button"
              data-testid="example"
              className={SECONDARY_BUTTON}
              onClick={() => setText(EXAMPLE)}
            >
              示例
            </button>
            <button
              type="button"
              data-testid="clear"
              className={SECONDARY_BUTTON}
              onClick={() => setText('')}
            >
              清空
            </button>
          </div>
        </div>
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <span className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            方向分析
          </span>
          {result.ok ? (
            <pre
              data-testid="output"
              className="min-h-40 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 font-mono text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
            >
              {result.value}
            </pre>
          ) : (
            <p
              data-testid="output"
              role="alert"
              className="min-h-40 w-full flex-1 overflow-auto rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              {result.value}
            </p>
          )}
          <div className="tool-actions mt-2 flex flex-wrap gap-2">
            <button type="button" data-testid="copy" className={SECONDARY_BUTTON} onClick={copy}>
              复制
            </button>
            <button
              type="button"
              data-testid="download"
              className={SECONDARY_BUTTON}
              onClick={() => result.ok && downloadText(`${meta.slug}.txt`, result.value)}
            >
              下载
            </button>
          </div>
        </div>
      </section>

      <section aria-label="渲染预览">
        <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          渲染预览（同一文本三种方向）
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className={PANEL}>
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">强制 RTL（dir=&quot;rtl&quot;）</p>
            <p data-testid="preview-rtl" dir="rtl" className="text-sm">
              {display}
            </p>
          </div>
          <div className={PANEL}>
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">强制 LTR（dir=&quot;ltr&quot;）</p>
            <p data-testid="preview-ltr" dir="ltr" className="text-sm">
              {display}
            </p>
          </div>
          <div className={PANEL}>
            <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">自动（dir=&quot;auto&quot;）</p>
            <p data-testid="preview-auto" dir="auto" className="text-sm">
              {display}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
