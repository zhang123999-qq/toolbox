import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  compressPdf,
  compressionRatioText,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
} from './utils'
import type { PdfCompressOptions } from './schema'

interface Result {
  url: string
  blob: Blob
  fileName: string
  origSize: number
  newSize: number
  pageCount: number
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<PdfCompressOptions>({ removeMetadata: true })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: PdfCompressOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        const data = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(data)) throw new Error(t('pdfCompress.error.unsupported'))
        const { bytes, pageCount } = await compressPdf(data, opts)
        // 拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
        const pdfCopy = new Uint8Array(bytes)
        const blob = new Blob([pdfCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        setResult({
          url,
          blob,
          fileName: buildOutputFileName(file.name),
          origSize: file.size,
          newSize: blob.size,
          pageCount,
        })
        setFileName(file.name)
      } catch (err) {
        if (isEncryptedPdfError(err)) {
          setError(t('pdfCompress.error.encrypted'))
        } else {
          setError(errorMessage(err))
        }
        setResult(null)
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
    (patch: Partial<PdfCompressOptions>) => {
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
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfCompress.note')}</p>

      {/* 效果有限的显著提示：本工具无法对图片重编码，多数文件只能减小 0–10% */}
      <div
        data-testid="limit-note"
        className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
      >
        {t('pdfCompress.limitNote')}
      </div>

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
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfCompress.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            data-testid="opt-metadata"
            type="checkbox"
            checked={options.removeMetadata}
            onChange={(e) => handleOptionChange({ removeMetadata: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          {t('pdfCompress.removeMetadata')}
        </label>
        {(result ?? fileName) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfCompress.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('pdfCompress.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染下载按钮，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-1 text-sm text-slate-500">
                {t('pdfCompress.original')}：{formatBytes(result.origSize)}
              </p>
              <p className="text-xs text-slate-400">
                {result.fileName.replace('-compressed.pdf', '.pdf')}
              </p>
            </div>
            <div className="rounded border border-slate-200 p-4 dark:border-slate-700">
              <p className="mb-1 text-sm text-slate-500">
                {t('pdfCompress.compressed')}：{formatBytes(result.newSize)}
              </p>
              <p className="text-xs text-slate-400">{result.fileName}</p>
            </div>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfCompress.stats')}：{formatBytes(result.origSize)} → {formatBytes(result.newSize)}
            （{compressionRatioText(result.origSize, result.newSize)}，{result.pageCount}{' '}
            {t('pdfCompress.pageUnit')}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfCompress.download')}
          </button>
        </div>
      )}
    </div>
  )
}
