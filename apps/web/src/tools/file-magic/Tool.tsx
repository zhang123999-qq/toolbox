import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { identifyFile } from './utils'
import { downloadReport } from './utils'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

/** 示例：PNG 文件头 16 字节 */
const EXAMPLE_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
])

export default function Tool() {
  const t = useTranslate()
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    setReport('')
    setError('')
  }

  async function runOn(target: File) {
    setPending(true)
    setError('')
    try {
      setReport(await identifyFile(target))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setReport('')
    } finally {
      setPending(false)
    }
  }

  function download() {
    if (!report) return
    downloadReport(report)
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
          htmlFor="tool-file"
          className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          {t('tool.file')}（≤ 200 MiB，只读文件头 64 字节）
        </label>
        <input
          id="tool-input"
          data-testid="input"
          type="hidden"
          value=""
          readOnly
          aria-hidden="true"
        />
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
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            disabled={pending || !file}
            onClick={() => file && runOn(file)}
          >
            {pending ? t('tool.running') : t('tool.run')}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            disabled={pending}
            onClick={() => {
              const demo = new File([EXAMPLE_BYTES], 'mystery.bin')
              setFile(demo)
              void runOn(demo)
            }}
          >
            {t('tool.example')}
          </button>
          <button
            type="button"
            data-testid="clear"
            className={SECONDARY_BUTTON}
            onClick={() => {
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
              选择文件后点「运行」，按文件头魔数鉴定真实类型
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
            disabled={!report}
            onClick={download}
          >
            {t('tool.download')}
          </button>
        </div>
      </div>
    </section>
  )
}
