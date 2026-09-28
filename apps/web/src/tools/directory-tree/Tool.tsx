import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { downloadReport, generateTree } from './utils'
import type { DirectoryTreeOptions, SortMode } from './schema'

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

/** React 类型里没有 webkitdirectory，局部扩展 */
type DirectoryInputProps = InputHTMLAttributes<HTMLInputElement> & {
  webkitdirectory?: string
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [paths, setPaths] = useState<string[]>([])
  const [folderName, setFolderName] = useState('')
  const [maxDepth, setMaxDepth] = useState('8')
  const [showHidden, setShowHidden] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('dirs-first')
  const [report, setReport] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  /* webkitdirectory 必须走 DOM 属性设置，React prop 不认 */
  useEffect(() => {
    fileRef.current?.setAttribute('webkitdirectory', '')
  }, [])

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? [])
    setPaths(
      selected.map(
        (f) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
      ),
    )
    setFolderName(
      selected[0]
        ? ((selected[0] as File & { webkitRelativePath?: string }).webkitRelativePath?.split(
            '/',
          )[0] ?? '')
        : '',
    )
    setReport('')
    setError('')
  }

  function options(): DirectoryTreeOptions {
    return {
      maxDepth: Number.parseInt(maxDepth, 10) || 8,
      showHidden,
      sortMode,
    }
  }

  async function run() {
    setPending(true)
    setError('')
    try {
      setReport(generateTree(paths, options()))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setReport('')
    } finally {
      setPending(false)
    }
  }

  function loadExample() {
    setPaths(['demo/src/index.ts', 'demo/src/util.ts', 'demo/README.md', 'demo/docs/guide.md'])
    setFolderName('demo')
    setReport('')
    setError('')
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
          htmlFor="tool-file"
          className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          {t('tool.file')}（选择文件夹，只读路径不上传）
        </label>
        <input
          id="tool-file"
          data-testid="file"
          ref={fileRef}
          type="file"
          {...({ webkitdirectory: '' } as DirectoryInputProps)}
          className="w-full text-sm text-slate-700 file:mr-2 file:rounded file:border file:border-slate-300 file:px-2 file:py-1 file:text-sm dark:text-slate-200"
          onChange={handleFiles}
        />
        {folderName !== '' && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            已选：{folderName}（{paths.length} 个文件）
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-1">
            最大深度
            <input
              id="tool-input"
              type="number"
              data-testid="input"
              min={1}
              max={20}
              className="w-20 rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={maxDepth}
              onChange={(event) => setMaxDepth(event.target.value)}
            />
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              data-testid="option-hidden"
              checked={showHidden}
              onChange={(event) => setShowHidden(event.target.checked)}
            />
            显示隐藏文件
          </label>
          <label className="flex items-center gap-1">
            排序
            <select
              data-testid="option-sort"
              className="rounded border border-slate-300 px-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="dirs-first">目录优先</option>
              <option value="alpha">纯字母</option>
            </select>
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
            {pending ? t('tool.running') : t('tool.run')}
          </button>
          <button
            type="button"
            data-testid="example"
            className={SECONDARY_BUTTON}
            onClick={loadExample}
          >
            {t('tool.example')}
          </button>
          <button
            type="button"
            data-testid="clear"
            className={SECONDARY_BUTTON}
            onClick={() => {
              setPaths([])
              setFolderName('')
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
              选择文件夹后点「运行」，生成树形目录结构
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
