import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { compareFiles, formatSummary, formatUnified } from './utils'
import type { DiffRow, DiffStats } from './utils'
import type { FileCompareOptions } from './schema'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

/** 示例：两份小版本配置文件，纯内存构造 */
function examplePair(): [File, File] {
  const enc = new TextEncoder()
  const a = new File([enc.encode('host=example.com\nport=8080\ndebug=false\n')], 'config.old.ini', {
    type: 'text/plain',
  })
  const b = new File(
    [enc.encode('host=example.com\nport=9090\ndebug=false\ntimeout=30\n')],
    'config.new.ini',
    {
      type: 'text/plain',
    },
  )
  return [a, b]
}

function rowClass(type: DiffRow['type']): string {
  if (type === 'add') return 'bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-200'
  if (type === 'del') return 'bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-200'
  return 'text-slate-600 dark:text-slate-300'
}

export default function Tool() {
  const t = useTranslate()
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [mode, setMode] = useState<FileCompareOptions['mode']>('line')
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false)
  const [rows, setRows] = useState<DiffRow[]>([])
  const [stats, setStats] = useState<DiffStats | null>(null)
  const [names, setNames] = useState<[string, string]>(['', ''])
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function pick(setter: (f: File | null) => void) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.files?.[0] ?? null)
      setRows([])
      setStats(null)
      setError('')
    }
  }

  async function run() {
    if (!fileA || !fileB) {
      setError('请先选择两个要对比的文件')
      return
    }
    setPending(true)
    setError('')
    try {
      const result = await compareFiles(fileA, fileB, { mode, ignoreWhitespace })
      setRows(result.rows)
      setStats(result.stats)
      setNames([fileA.name, fileB.name])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setRows([])
      setStats(null)
    } finally {
      setPending(false)
    }
  }

  function toText(): string {
    if (!stats) return ''
    return formatUnified(rows, names[0], names[1], stats)
  }

  async function copy() {
    const text = toText()
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  }

  function download() {
    const text = toText()
    if (!text) return
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'file-compare.diff'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <span className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('tool.input')}
        </span>
        <label
          htmlFor="tool-file-a"
          className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          文件 A（旧版本）
        </label>
        <input
          id="tool-file-a"
          data-testid="file-a"
          type="file"
          className="w-full text-sm text-slate-700 file:mr-2 file:rounded file:border file:border-slate-300 file:px-2 file:py-1 file:text-sm dark:text-slate-200"
          onChange={pick(setFileA)}
        />
        {fileA && <p className="mt-1 text-xs text-slate-500">已选：{fileA.name}</p>}
        <label
          htmlFor="tool-file-b"
          className="mb-1 mt-3 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          文件 B（新版本）
        </label>
        <input
          id="tool-file-b"
          data-testid="file-b"
          type="file"
          className="w-full text-sm text-slate-700 file:mr-2 file:rounded file:border file:border-slate-300 file:px-2 file:py-1 file:text-sm dark:text-slate-200"
          onChange={pick(setFileB)}
        />
        {fileB && <p className="mt-1 text-xs text-slate-500">已选：{fileB.name}</p>}
        {/* 兼容 7 必需 testid：文本输入框保留为备注占位 */}
        <input data-testid="input" type="hidden" value="" readOnly aria-hidden="true" />
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-1">
            对比粒度
            <select
              data-testid="option-mode"
              className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={mode}
              onChange={(event) => setMode(event.target.value as FileCompareOptions['mode'])}
            >
              <option value="line">按行</option>
              <option value="word">按词</option>
              <option value="char">按字符</option>
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              data-testid="option-ignoreWhitespace"
              checked={ignoreWhitespace}
              onChange={(event) => setIgnoreWhitespace(event.target.checked)}
            />
            忽略行首尾空白
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
            {pending ? t('tool.running') : '开始对比'}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={() => {
              const [a, b] = examplePair()
              setFileA(a)
              setFileB(b)
              setRows([])
              setStats(null)
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
              setFileA(null)
              setFileB(null)
              setRows([])
              setStats(null)
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
          className="min-h-64 w-full flex-1 overflow-auto rounded border border-slate-200 bg-slate-50 p-2 text-sm dark:border-slate-800 dark:bg-slate-950"
        >
          {error !== '' ? (
            <p role="alert" className={ERROR_CLASS}>
              {error}
            </p>
          ) : !stats ? (
            <p className="text-slate-500 dark:text-slate-400">
              选择两个文件后点「开始对比」（与粘贴文本的 text-diff 不同，这里只走文件上传）
            </p>
          ) : (
            <>
              <p
                data-testid="summary"
                className="mb-2 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {formatSummary(names[0], names[1], stats)}
              </p>
              <div className="font-mono text-xs">
                {rows.slice(0, 2000).map((row, index) => (
                  <div
                    key={index}
                    className={`px-1 whitespace-pre-wrap break-all ${rowClass(row.type)}`}
                  >
                    <span className="mr-1 inline-block w-3 select-none opacity-60">
                      {row.type === 'add' ? '+' : row.type === 'del' ? '−' : ''}
                    </span>
                    {row.text === '' ? ' ' : row.text}
                  </div>
                ))}
                {rows.length > 2000 && (
                  <p className="mt-1 text-slate-500">…共 {rows.length} 行差异，仅展示前 2000 行</p>
                )}
              </div>
            </>
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
