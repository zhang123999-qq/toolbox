import { useCallback, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import { canvasToBlob, downloadBlob } from '../../lib/image'
import {
  DPI_VALUES,
  assertFileSizeOk,
  assertRenderSizeOk,
  buildPageFileName,
  computeScale,
  errorMessage,
  formatToMime,
  isPdfFile,
  parseDpi,
  parsePageSelection,
} from './utils'
import type { PdfToImageOptions } from './schema'

// pdfjs worker：与 pdfjs-dist 打包在一起的 min 版 worker，本地加载不经过网络 CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface PageResult {
  page: number
  url: string
  fileName: string
  width: number
  height: number
  blob: Blob
}

interface Progress {
  current: number
  total: number
}

const FORMAT_OPTIONS = ['png', 'jpeg'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [results, setResults] = useState<PageResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [options, setOptions] = useState<PdfToImageOptions>({
    dpi: '150',
    pages: 'all',
    format: 'png',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: PdfToImageOptions) => {
      setProgress({ current: 0, total: 0 })
      setError(null)
      setResults([])
      try {
        assertFileSizeOk(file.size)
        if (!isPdfFile(file)) throw new Error(t('pdfToImage.error.unsupported'))
        const dpi = parseDpi(opts.dpi)
        const scale = computeScale(Number(dpi))
        const data = await file.arrayBuffer()
        const doc = await pdfjsLib.getDocument({ data }).promise
        const pageNums = parsePageSelection(opts.pages, doc.numPages)
        const base = file.name.replace(/\.[a-z0-9]+$/i, '')
        const pages: PageResult[] = []
        for (let i = 0; i < pageNums.length; i++) {
          const n = pageNums[i]
          setProgress({ current: i + 1, total: pageNums.length })
          const page = await doc.getPage(n)
          const viewport = page.getViewport({ scale })
          assertRenderSizeOk(viewport.width, viewport.height)
          const canvas = document.createElement('canvas')
          canvas.width = Math.max(1, Math.round(viewport.width))
          canvas.height = Math.max(1, Math.round(viewport.height))
          await page.render({ canvas, viewport }).promise
          const blob = await canvasToBlob(canvas, formatToMime(opts.format))
          pages.push({
            page: n,
            url: URL.createObjectURL(blob),
            fileName: buildPageFileName(base, n, opts.format),
            width: canvas.width,
            height: canvas.height,
            blob,
          })
        }
        setResults(pages)
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setResults([])
      } finally {
        setProgress(null)
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
    (patch: Partial<PdfToImageOptions>) => {
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
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfToImage.note')}</p>

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
          {fileName ? fileName : t('pdfToImage.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfToImage.dpi')}
          <select
            data-testid="opt-dpi"
            value={options.dpi}
            onChange={(e) =>
              handleOptionChange({ dpi: e.target.value as PdfToImageOptions['dpi'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {DPI_VALUES.map((d) => (
              <option key={d} value={d}>
                {d} DPI
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfToImage.pages')}
          <input
            data-testid="opt-pages"
            type="text"
            value={options.pages}
            placeholder={t('pdfToImage.pagesHint')}
            onChange={(e) => handleOptionChange({ pages: e.target.value })}
            className="w-32 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfToImage.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as PdfToImageOptions['format'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        {(results.length > 0 || fileName !== '') && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfToImage.reset')}
          </button>
        )}
      </div>

      {progress !== null && (
        <p data-testid="processing">
          {t('pdfToImage.rendering')} {progress.current}/{progress.total}{' '}
          {t('pdfToImage.pageSuffix')}
        </p>
      )}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：每页独立预览与下载按钮 */}
      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {results.map((r) => (
            <figure key={r.page} data-testid="page-result" className="flex flex-col gap-2">
              <img src={r.url} alt="" className="max-h-64 rounded border object-contain" />
              <figcaption className="text-sm text-slate-500">
                {t('pdfToImage.page')} {r.page} ({r.width}×{r.height})
              </figcaption>
              <button
                data-testid="download-page"
                type="button"
                // results 非空才渲染此按钮，TS 已收窄，无需空守卫
                onClick={() => downloadBlob(r.blob, r.fileName)}
                className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >
                {t('pdfToImage.download')}
              </button>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
