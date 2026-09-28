import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { downloadBytes, formatMapping, packRenamed, readFiles, renameFiles } from './utils'
import type { BatchRenameRule, BatchRenameOptions } from './schema'
import type { RenameRecord } from './utils'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

export default function Tool() {
  const t = useTranslate()
  const [rule, setRule] = useState<BatchRenameRule>('prefix')
  const [prefix, setPrefix] = useState('IMG_')
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [start, setStart] = useState('1')
  const [digits, setDigits] = useState('3')
  const [files, setFiles] = useState<File[]>([])
  const [records, setRecords] = useState<RenameRecord[]>([])
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    setFiles(Array.from(event.target.files ?? []))
    setRecords([])
    setReport('')
    setError('')
  }

  function options(): BatchRenameOptions {
    return {
      rule,
      prefix,
      find,
      replace,
      start: Number.parseInt(start, 10) || 0,
      digits: Number.parseInt(digits, 10) || 3,
    }
  }

  async function run() {
    setPending(true)
    setError('')
    try {
      const names = files.map((f) => f.name)
      const renamed = renameFiles(names, options())
      const datas = await readFiles(files)
      const out: RenameRecord[] = names.map((original, index) => ({
        original,
        renamed: renamed[index] as string,
        data: datas[index] as Uint8Array,
      }))
      setRecords(out)
      setReport(formatMapping(names, renamed))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setRecords([])
      setReport('')
    } finally {
      setPending(false)
    }
  }

  function download() {
    if (records.length === 0) return
    downloadBytes('renamed.zip', packRenamed(records), 'application/zip')
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
          {t('tool.file')}（多选，总量 ≤ 200 MiB）
        </label>
        <input
          id="tool-file"
          data-testid="file"
          type="file"
          multiple
          className="w-full text-sm text-slate-700 file:mr-2 file:rounded file:border file:border-slate-300 file:px-2 file:py-1 file:text-sm dark:text-slate-200"
          onChange={handleFiles}
        />
        {files.length > 0 && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            已选 {files.length} 个文件
          </p>
        )}
        <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2">
            规则
            <select
              data-testid="option-rule"
              className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={rule}
              onChange={(event) => setRule(event.target.value as BatchRenameRule)}
            >
              <option value="prefix">加前缀</option>
              <option value="number">按序号</option>
              <option value="replace">查找替换</option>
            </select>
          </label>
          {(rule === 'prefix' || rule === 'number') && (
            <label className="flex items-center gap-2">
              前缀
              <input
                type="text"
                id="tool-input"
                data-testid="input"
                className="flex-1 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder={rule === 'prefix' ? 'IMG_' : 'pic'}
                value={prefix}
                onChange={(event) => setPrefix(event.target.value)}
              />
            </label>
          )}
          {rule === 'number' && (
            <>
              <label className="flex items-center gap-2">
                起始编号
                <input
                  id="tool-input"
                  data-testid="option-start"
                  type="number"
                  min={0}
                  className="w-24 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2">
                编号位数
                <input
                  type="number"
                  data-testid="option-digits"
                  min={1}
                  max={6}
                  className="w-24 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={digits}
                  onChange={(event) => setDigits(event.target.value)}
                />
              </label>
            </>
          )}
          {rule === 'replace' && (
            <>
              <label className="flex items-center gap-2">
                查找
                <input
                  id="tool-input"
                  data-testid="input"
                  type="text"
                  className="flex-1 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={find}
                  onChange={(event) => setFind(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2">
                替换为
                <input
                  type="text"
                  data-testid="option-replace"
                  className="flex-1 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  value={replace}
                  onChange={(event) => setReplace(event.target.value)}
                />
              </label>
            </>
          )}
        </div>
        <div className="tool-actions mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="run"
            className="rounded bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            disabled={pending}
            onClick={run}
          >
            {pending ? t('tool.running') : t('tool.run')}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setFiles([new File(['a'], 'photo1.jpg'), new File(['b'], 'photo2.jpg')])
              setRule('prefix')
              setPrefix('trip_')
              setRecords([])
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
              setRecords([])
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
              选好文件与规则后点「运行」，预览对照表后再下载 renamed.zip
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
            disabled={records.length === 0}
            onClick={download}
          >
            {t('tool.download')}
          </button>
        </div>
      </div>
    </section>
  )
}
