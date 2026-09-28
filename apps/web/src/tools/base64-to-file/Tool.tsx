import { useState } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { decodeToFile, downloadBytes, formatReport, resolveMime } from './utils'
import type { DecodedFile } from './utils'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

/** 示例：hello 的 base64 */
const EXAMPLE = 'aGVsbG8gd29ybGQ='

export default function Tool() {
  const t = useTranslate()
  const [text, setText] = useState('')
  const [filename, setFilename] = useState('decoded')
  const [extension, setExtension] = useState('')
  const [decoded, setDecoded] = useState<DecodedFile | null>(null)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')

  function run() {
    setError('')
    try {
      const out = decodeToFile(text, { filename, extension })
      setDecoded(out)
      setReport(formatReport(out, text.trim().length))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setDecoded(null)
      setReport('')
    }
  }

  function download() {
    if (!decoded) return
    downloadBytes(decoded.filename, decoded.data, resolveMime(decoded.mime))
  }

  async function copy() {
    if (!report) return
    try {
      await navigator.clipboard.writeText(report)
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <label
          htmlFor="tool-input"
          className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {t('tool.input')}（Base64 文本，可带 data: URL 前缀）
        </label>
        <textarea
          id="tool-input"
          data-testid="input"
          className="min-h-64 w-full flex-1 resize-y rounded border border-slate-200 p-2 font-mono text-sm break-all dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder="aGVsbG8gd29ybGQ= 或 data:image/png;base64,iVBORw0KGgo…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-1">
            文件名
            <input
              type="text"
              data-testid="option-filename"
              className="w-32 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-1">
            扩展名
            <input
              type="text"
              data-testid="option-extension"
              className="w-20 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="png"
              value={extension}
              onChange={(event) => setExtension(event.target.value)}
            />
          </label>
        </div>
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
            onClick={run}
          >
            {t('tool.run')}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => setText(EXAMPLE)}
          >
            {t('tool.example')}
          </button>
          <button
            type="button"
            data-testid="clear"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setText('')
              setDecoded(null)
              setReport('')
              setError('')
            }}
          >
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
          ) : report === '' ? (
            <p className="text-slate-500 dark:text-slate-400">
              粘贴 Base64 后点「运行」，再点「下载」把解码出的文件保存到本地
            </p>
          ) : (
            <pre className="font-mono text-xs whitespace-pre-wrap">{report}</pre>
          )}
        </div>
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button type="button" data-testid="copy" className={SECONDARY_BUTTON} onClick={copy}>
            {t('tool.copy')}
          </button>
          <button
            type="button"
            data-testid="download"
            className={SECONDARY_BUTTON}
            disabled={!decoded}
            onClick={download}
          >
            {t('tool.download')}
          </button>
        </div>
      </div>
    </section>
  )
}
