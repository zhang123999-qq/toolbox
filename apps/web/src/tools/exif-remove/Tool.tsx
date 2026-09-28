import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  JPEG_QUALITY,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseFormat,
  savedBytesText,
} from './utils'
import type { ExifRemoveOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  origSize: number
  newSize: number
  blob: Blob
}

const FORMAT_OPTIONS = ['jpeg', 'png'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<ExifRemoveOptions>({ format: 'jpeg' })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ExifRemoveOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('exifRemove.error.unsupported'))
        const format = parseFormat(opts.format)
        const img = await loadImageFromBlob(file)
        // 按原尺寸绘制：Canvas 只保留像素数据，不保留任何元数据
        const canvas = drawScaled(img, img.width, img.height, img.width, img.height)
        const blob = await canvasToBlob(
          canvas,
          formatToMime(format),
          format === 'jpeg' ? JPEG_QUALITY : undefined,
        )
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, format),
          width: img.width,
          height: img.height,
          origSize: file.size,
          newSize: blob.size,
          blob,
        })
        setPreviewUrl(preview)
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
      const file = files?.[0]
      if (!file) return
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<ExifRemoveOptions>) => {
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
    setPreviewUrl(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('exifRemove.note')}</p>

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
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('exifRemove.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('exifRemove.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ExifRemoveOptions['format'] })
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
        {(result ?? previewUrl) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('exifRemove.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('exifRemove.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('exifRemove.original')} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('exifRemove.cleaned')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>

          {/* 前后对比：原图大小 / 新图大小 / 节省量 / 尺寸 */}
          <dl
            data-testid="compare"
            className="grid grid-cols-2 gap-2 rounded border border-slate-200 p-3 text-sm sm:grid-cols-4 dark:border-slate-700"
          >
            <div>
              <dt className="text-slate-500">{t('exifRemove.originalSize')}</dt>
              <dd data-testid="compare-orig" className="font-medium">
                {formatBytes(result.origSize)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('exifRemove.newSize')}</dt>
              <dd data-testid="compare-new" className="font-medium">
                {formatBytes(result.newSize)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('exifRemove.saved')}</dt>
              <dd data-testid="compare-saved" className="font-medium">
                {savedBytesText(result.origSize, result.newSize)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('exifRemove.dimensions')}</dt>
              <dd data-testid="compare-dims" className="font-medium">
                {result.width} × {result.height}
              </dd>
            </div>
          </dl>

          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {/* 注：键合并前 t 返回 undefined 仅渲染空，此处刻意不用 t(key, params)
                形式——缺键时带 params 会抛 TypeError，导致合并前单测无法运行；
                键合并后如需 {name} 占位形式可再改回 */}
            {t('exifRemove.stats')}: {result.width} × {result.height} ·{' '}
            {savedBytesText(result.origSize, result.newSize)}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('exifRemove.download')}
          </button>
        </div>
      )}
    </div>
  )
}
