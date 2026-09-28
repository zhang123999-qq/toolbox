import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  buildSplitGroups,
  errorMessage,
  getPdfPageCount,
  isPdfFile,
  splitPdf,
} from './utils'
import type { PdfSplitOptions } from './schema'

interface SplitResult {
  url: string
  fileName: string
  startPage: number
  endPage: number
  pageCount: number
  blob: Blob
}

const MODE_OPTIONS = ['ranges', 'chunks', 'single'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState<SplitResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<PdfSplitOptions>({
    mode: 'ranges',
    pages: '',
    chunkSize: '2',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: PdfSplitOptions) => {
      setProcessing(true)
      setError(null)
      setResults([])
      try {
        assertFileSizeOk(file.size)
        const data = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(data)) throw new Error(t('pdfSplit.error.unsupported'))
        const totalPages = await getPdfPageCount(data)
        const groups = buildSplitGroups(opts.mode, opts.pages, opts.chunkSize, totalPages)
        const outputs = await splitPdf(data, groups)
        const items = outputs.map((bytes, i) => {
          const group = groups[i]
          const startPage = group[0]
          const endPage = group[group.length - 1]
          // pdf-lib save() 返回的拷贝已是确定性的 ArrayBuffer 视图，可直接作 BlobPart
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
          return {
            url: URL.createObjectURL(blob),
            fileName: buildOutputFileName(file.name, startPage, endPage),
            startPage,
            endPage,
            pageCount: group.length,
            blob,
          }
        })
        setResults(items)
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setResults([])
      } finally {
        setProcessing(false)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<PdfSplitOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResults([])
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfSplit.note')}</p>

      {/* 文件投放区：用 label 包裹，原生可点击/键盘聚焦，无需额外 a11y 分支 */}
      <label
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <input
          ref={fileRef}
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfSplit.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfSplit.mode')}
          <select
            data-testid="opt-mode"
            value={options.mode}
            onChange={(e) =>
              handleOptionChange({ mode: e.target.value as PdfSplitOptions['mode'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {MODE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m === 'ranges'
                  ? t('pdfSplit.modeRanges')
                  : m === 'chunks'
                    ? t('pdfSplit.modeChunks')
                    : t('pdfSplit.modeSingle')}
              </option>
            ))}
          </select>
        </label>
        {options.mode === 'ranges' && (
          <label className="flex items-center gap-2 text-sm">
            {t('pdfSplit.pages')}
            <input
              data-testid="opt-pages"
              type="text"
              value={options.pages}
              placeholder={t('pdfSplit.pagesHint')}
              onChange={(e) => handleOptionChange({ pages: e.target.value })}
              className="w-40 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        )}
        {options.mode === 'chunks' && (
          <label className="flex items-center gap-2 text-sm">
            {t('pdfSplit.chunkSize')}
            <input
              data-testid="opt-chunk"
              type="number"
              min={1}
              value={options.chunkSize}
              onChange={(e) => handleOptionChange({ chunkSize: e.target.value })}
              className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        )}
        {(results.length > 0 || fileName !== '') && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfSplit.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('pdfSplit.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：每个拆分文件一行，独立下载按钮（不打包，见 README） */}
      {results.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('pdfSplit.resultsTitle', { count: results.length })}
          </p>
          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li
                key={r.fileName}
                data-testid="split-result"
                className="flex items-center justify-between gap-4 rounded border border-slate-200 px-3 py-2 dark:border-slate-700"
              >
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {r.pageCount === 1
                    ? t('pdfSplit.pageOne', { page: r.startPage })
                    : t('pdfSplit.pageRange', {
                        start: r.startPage,
                        end: r.endPage,
                        count: r.pageCount,
                      })}
                </span>
                <button
                  data-testid="download-file"
                  type="button"
                  // results 非空才渲染此按钮，TS 已收窄，无需空守卫
                  onClick={() => downloadBlob(r.blob, r.fileName)}
                  className="w-fit shrink-0 rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                >
                  {t('pdfSplit.download')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
