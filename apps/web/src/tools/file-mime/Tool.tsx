import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { lookupFile, lookupText } from './utils'
import { downloadReport } from './utils'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const t = useTranslate()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    setReport('')
    setError('')
  }

  function runText() {
    setError('')
    try {
      setReport(lookupText(text))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setReport('')
    }
  }

  async function runFile() {
    if (!file) {
      setError('请先选择要查询的文件')
      return
    }
    setPending(true)
    setError('')
    try {
      setReport(await lookupFile(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setReport('')
    } finally {
      setPending(false)
    }
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
    downloadReport(report)
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <label
          htmlFor="tool-input"
          className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          {t('tool.input')}（扩展名，如 png）
        </label>
        <input
          id="tool-input"
          data-testid="input"
          type="text"
          className="w-full rounded border border-slate-200 p-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder="png"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <label
          htmlFor="tool-file"
          className="mt-3 mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          或选择文件校对扩展名与文件头（≤ 200 MiB）
        </label>
        <input
          id="tool-file"
          data-testid="file"
          type="file"
          className="w-full text-sm text-slate-700 file:mr-2 file:rounded file:border file:border-slate-300 file:px-2 file:py-1 file:text-sm dark:text-slate-200"
          onChange={handleFile}
        />
        {file && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">已选：{file.name}</p>
        )}
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
            onClick={runText}
          >
            {t('tool.run')}
          </button>
          <button
            type="button"
            data-testid="run-file"
            className={SECONDARY_BUTTON}
            disabled={pending}
            onClick={runFile}
          >
            {pending ? t('tool.running') : '查询所选文件'}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setText('png')
              setFile(null)
              setReport('')
              setError('')
            }}
          >
            {t('tool.example')}
          </button>
          <button
            type="button"
            data-testid="clear"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setText('')
              setFile(null)
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
              输入扩展名点「运行」查 MIME，或选文件后点「查询所选文件」校对
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
            onClick={download}
          >
            {t('tool.download')}
          </button>
        </div>
      </div>
    </section>
  )
}
