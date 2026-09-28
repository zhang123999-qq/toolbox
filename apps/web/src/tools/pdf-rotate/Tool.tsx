import { useCallback, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { useTranslate } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  normalizeAngle,
  parsePageRanges,
  rotatePdf,
} from './utils'
import type { PdfRotateOptions } from './schema'

interface Result {
  url: string
  fileName: string
  blob: Blob
  rotated: number
  total: number
  size: number
}

const ANGLE_OPTIONS = ['90', '180', '270'] as const

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [pageCount, setPageCount] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<PdfRotateOptions>({
    angle: '90',
    scope: 'all',
    pages: '',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: PdfRotateOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        const data = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(data)) throw new Error(t('pdfRotate.error.notPdf'))
        let doc
        try {
          doc = await PDFDocument.load(data)
        } catch (err) {
          if (isEncryptedPdfError(err))
            throw new Error(t('pdfRotate.error.encrypted'), { cause: err })
          throw err
        }
        const total = doc.getPageCount()
        setPageCount(total)
        const delta = normalizeAngle(Number(opts.angle))
        const pageNums =
          opts.scope === 'all'
            ? Array.from({ length: total }, (_, i) => i + 1)
            : parsePageRanges(opts.pages, total)
        const out = await rotatePdf(data, pageNums, delta)
        // pdf-lib save() 返回 Uint8Array<ArrayBufferLike>，拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
        const copy = new Uint8Array(out)
        const blob = new Blob([copy.buffer as ArrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setResult({
          url,
          fileName: buildOutputFileName(file.name),
          blob,
          rotated: pageNums.length,
          total,
          size: blob.size,
        })
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setResult(null)
      } finally {
        setProcessing(false)
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const f = files?.[0]
      if (!f) return
      setFile(f)
      void processFile(f, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<PdfRotateOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      if (file) void processFile(file, next)
    },
    [file, options, processFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setFile(null)
    setResult(null)
    setPageCount(0)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfRotate.note')}</p>

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
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfRotate.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfRotate.angle')}
          <select
            data-testid="opt-angle"
            value={options.angle}
            onChange={(e) =>
              handleOptionChange({ angle: e.target.value as PdfRotateOptions['angle'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {ANGLE_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a}°
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex items-center gap-3 text-sm">
          <legend className="sr-only">{t('pdfRotate.scope')}</legend>
          <span>{t('pdfRotate.scope')}</span>
          <label className="flex items-center gap-1">
            <input
              data-testid="opt-scope-all"
              type="radio"
              name="pdf-rotate-scope"
              checked={options.scope === 'all'}
              onChange={() => handleOptionChange({ scope: 'all' })}
            />
            {t('pdfRotate.scopeAll')}
          </label>
          <label className="flex items-center gap-1">
            <input
              data-testid="opt-scope-pages"
              type="radio"
              name="pdf-rotate-scope"
              checked={options.scope === 'pages'}
              onChange={() => handleOptionChange({ scope: 'pages' })}
            />
            {t('pdfRotate.scopePages')}
          </label>
        </fieldset>
        {options.scope === 'pages' && (
          <label className="flex items-center gap-2 text-sm">
            {t('pdfRotate.pagesLabel')}
            <input
              data-testid="opt-pages"
              type="text"
              placeholder={t('pdfRotate.pagesPlaceholder')}
              value={options.pages}
              onChange={(e) => handleOptionChange({ pages: e.target.value })}
              className="w-32 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        )}
        {(result ?? error) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfRotate.reset')}
          </button>
        )}
      </div>

      {options.scope === 'pages' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('pdfRotate.pagesHint')}</p>
      )}
      {pageCount > 0 && (
        <p data-testid="page-count" className="text-xs text-slate-500 dark:text-slate-400">
          {t('pdfRotate.docHasPages')}
          {pageCount}
          {t('pdfRotate.pagesUnit')}
        </p>
      )}

      {processing && <p data-testid="processing">{t('pdfRotate.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：只在 result 存在时渲染下载按钮 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfRotate.done')}：{result.rotated}/{result.total}
            {t('pdfRotate.pagesUnit')}（{formatBytes(result.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfRotate.download')}
          </button>
        </div>
      )}
    </div>
  )
}
