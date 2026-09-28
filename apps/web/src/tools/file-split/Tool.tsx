import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { downloadBytes, formatPlan, formatSize, splitFile } from './utils'
import type { FilePart } from './utils'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const t = useTranslate()
  const [mode, setMode] = useState<'size' | 'count'>('size')
  const [value, setValue] = useState('10MB')
  const [file, setFile] = useState<File | null>(null)
  const [parts, setParts] = useState<FilePart[]>([])
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
    setParts([])
    setReport('')
    setError('')
  }

  async function run() {
    if (!file) {
      setError('请先选择要切分的文件')
      return
    }
    setPending(true)
    setError('')
    try {
      const out = await splitFile(file, { mode }, value)
      setParts(out)
      setReport(formatPlan(file.name, file.size, out, { mode }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setParts([])
    } finally {
      setPending(false)
    }
  }

  function downloadPart(part: FilePart) {
    downloadBytes(part.name, part.data)
  }

  function downloadAll() {
    for (const part of parts) downloadBytes(part.name, part.data)
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
          {t('tool.file')}（≤ 200 MiB）
        </label>
        <input
          id="tool-file"
          data-testid="file"
          type="file"
          className="w-full text-sm text-slate-700 file:mr-2 file:rounded file:border file:border-slate-300 file:px-2 file:py-1 file:text-sm dark:text-slate-200"
          onChange={handleFile}
        />
        {file && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            已选：{file.name}（{formatSize(file.size)}）
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-1">
            切分方式
            <select
              data-testid="option-mode"
              className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={mode}
              onChange={(event) => {
                const next = event.target.value as 'size' | 'count'
                setMode(next)
                setValue(next === 'size' ? '10MB' : '5')
              }}
            >
              <option value="size">按大小</option>
              <option value="count">按数量</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            {mode === 'size' ? '每片大小' : '分片数量'}
            <input
              id="tool-input"
              data-testid="input"
              type="text"
              className="w-32 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder={mode === 'size' ? '10MB' : '5'}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
        </div>
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            disabled={pending}
            onClick={run}
          >
            {pending ? t('tool.running') : '开始切分'}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setValue('4B')
              setMode('size')
              setParts([])
              setReport('')
              setError('')
              setFile(new File([new TextEncoder().encode('0123456789abcdef')], 'demo.bin'))
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
              setParts([])
              setReport('')
              setError('')
            }}
          >
            {t('tool.clear')}
          </button>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('tool.output')}
          </span>
          {parts.length > 0 && (
            <button
              type="button"
              data-testid="download-all"
              className={SECONDARY_BUTTON}
              onClick={downloadAll}
            >
              全部下载
            </button>
          )}
        </div>
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
              选择文件、填好切分参数后点「开始切分」，分片在下方逐个下载
            </p>
          ) : (
            <pre className="font-mono text-xs whitespace-pre-wrap">{report}</pre>
          )}
          {parts.length > 0 && (
            <ul
              data-testid="part-list"
              className="mt-2 divide-y divide-slate-100 dark:divide-slate-800"
            >
              {parts.map((part) => (
                <li
                  key={part.name}
                  className="flex items-center justify-between gap-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate font-mono">{part.name}</span>
                  <button
                    type="button"
                    data-testid={'download-part-' + part.name}
                    className={SECONDARY_BUTTON}
                    onClick={() => downloadPart(part)}
                  >
                    下载
                  </button>
                </li>
              ))}
            </ul>
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
            disabled={parts.length === 0}
            onClick={downloadAll}
          >
            {t('tool.download')}
          </button>
        </div>
      </div>
    </section>
  )
}
