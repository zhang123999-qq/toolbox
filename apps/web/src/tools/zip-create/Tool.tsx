import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import {
  COMPRESSION_LEVELS,
  createZip,
  downloadBytes,
  formatReport,
  formatSize,
  readUploads,
  resolveArchiveName,
  totalBytes,
} from './utils'
import type { ZipEntryInput } from './utils'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

/** 示例文件：纯内存构造，不经过上传入口也能演示打包 */
function exampleFiles(): File[] {
  const enc = new TextEncoder()
  return [
    new File([enc.encode('hello zip\n')], 'hello.txt', { type: 'text/plain' }),
    new File([enc.encode('{"a":1}\n')], 'data.json', { type: 'application/json' }),
    new File([enc.encode('第一行\n第二行\n')], 'notes.txt', { type: 'text/plain' }),
  ]
}

export default function Tool() {
  const t = useTranslate()
  const [archiveName, setArchiveName] = useState('archive')
  const [files, setFiles] = useState<File[]>([])
  const [level, setLevel] = useState(6)
  const [entries, setEntries] = useState<ZipEntryInput[]>([])
  const [zipData, setZipData] = useState<Uint8Array<ArrayBuffer> | null>(null)
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files ? Array.from(event.target.files) : []
    setFiles(picked)
    setZipData(null)
    setReport('')
    setError('')
  }

  async function run() {
    setPending(true)
    setError('')
    try {
      const uploads = await readUploads(files)
      const zip = createZip(uploads, { level })
      const name = resolveArchiveName(archiveName)
      setEntries(uploads)
      setZipData(zip)
      setReport(
        formatReport(
          name,
          uploads.map((u) => u.name),
          totalBytes(uploads),
          zip.length,
          level,
        ),
      )
      downloadBytes(`${name}.zip`, zip, 'application/zip')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setZipData(null)
    } finally {
      setPending(false)
    }
  }

  function downloadAgain() {
    if (!zipData) return
    downloadBytes(`${resolveArchiveName(archiveName)}.zip`, zipData, 'application/zip')
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
          压缩包文件名（不含 .zip）
        </label>
        <input
          id="tool-input"
          data-testid="input"
          type="text"
          className="mb-2 w-full rounded border border-slate-200 p-2 font-mono text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={archiveName}
          onChange={(event) => setArchiveName(event.target.value)}
        />
        <label
          htmlFor="tool-file"
          className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          {t('tool.file')}（可多选，总大小 ≤ 200 MiB）
        </label>
        <input
          id="tool-file"
          data-testid="file"
          type="file"
          multiple
          className="w-full text-sm text-slate-700 file:mr-2 file:rounded file:border file:border-slate-300 file:px-2 file:py-1 file:text-sm dark:text-slate-200"
          onChange={handleFiles}
        />
        <label className="mt-2 flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
          压缩级别
          <select
            data-testid="option-level"
            className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            value={String(level)}
            onChange={(event) => setLevel(Number(event.target.value))}
          >
            {COMPRESSION_LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                {lv === 0 ? '0（仅存储）' : String(lv)}
              </option>
            ))}
          </select>
        </label>
        {files.length > 0 && (
          <ul
            data-testid="file-list"
            className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400"
          >
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex justify-between gap-2">
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 tabular-nums">{formatSize(file.size)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            disabled={pending}
            onClick={run}
          >
            {pending ? t('tool.running') : '打包并下载'}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setFiles(exampleFiles())
              setZipData(null)
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
              setFiles([])
              setEntries([])
              setZipData(null)
              setReport('')
              setError('')
              setArchiveName('archive')
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
              选择文件后点「打包并下载」，zip 会直接保存到本地（纯本地处理，不上传）
            </p>
          ) : (
            <pre className="font-mono text-xs whitespace-pre-wrap">{report}</pre>
          )}
          {entries.length > 0 && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              已选 {entries.length} 个文件（示例文件可直接打包试看效果）
            </p>
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
            disabled={!zipData}
            onClick={downloadAgain}
          >
            重新下载
          </button>
        </div>
      </div>
    </section>
  )
}
