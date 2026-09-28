import { useState } from 'react'
import { meta } from './meta'
import { readText, roundtripCheck, roundtripText, supportsClipboard, writeText } from './utils'
import type { ClipboardLike, ClipboardNavigatorLike } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
const INPUT_CLASS =
  'w-full rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'

/**
 * 剪贴板测试：写入/读取/往返一致性校验；clipboard 可注入；
 * API 缺失时中文提示。
 */
export default function Tool() {
  const [text, setText] = useState('剪贴板测试文本')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function currentClip(): ClipboardLike | null {
    const nav = navigator as unknown as ClipboardNavigatorLike
    return nav.clipboard ?? null
  }

  async function run(fn: (clip: ClipboardLike) => Promise<string>): Promise<void> {
    setError('')
    setResult('')
    setBusy(true)
    try {
      const clip = currentClip()
      if (!supportsClipboard({ clipboard: clip })) {
        throw new Error('当前浏览器不支持 Clipboard API（需要 HTTPS 环境）')
      }
      setResult(await fn(clip as ClipboardLike))
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="text"
        className={INPUT_CLASS}
        value={text}
        onChange={(e) => setText(e.target.value)}
        data-testid="clipboard-input"
        aria-label="待写入文本"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={BTN_CLASS}
          data-testid="clipboard-write"
          disabled={busy}
          onClick={() => void run((clip) => writeText(clip, text).then(() => '写入成功'))}
        >
          写入剪贴板
        </button>
        <button
          type="button"
          className={BTN_CLASS}
          data-testid="clipboard-read"
          disabled={busy}
          onClick={() => void run((clip) => readText(clip).then((t) => `读回：${t}`))}
        >
          读取剪贴板
        </button>
        <button
          type="button"
          className={BTN_CLASS}
          data-testid="clipboard-roundtrip"
          disabled={busy}
          onClick={() => void run((clip) => roundtripCheck(clip, text).then(roundtripText))}
        >
          往返一致性校验
        </button>
      </div>
      {result && (
        <p
          className="text-sm text-emerald-700 dark:text-emerald-400"
          data-testid="clipboard-result"
        >
          {result}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" data-testid="clipboard-error">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">
        读取剪贴板通常需要用户授权；写入仅用于本次测试。工具信息：{meta.title}（#864）
      </p>
    </div>
  )
}
