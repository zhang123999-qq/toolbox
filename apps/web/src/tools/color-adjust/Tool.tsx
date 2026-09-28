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
  adjustPixels,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseColorValue,
} from './utils'
import type { ColorAdjustOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  origSize: number
  newSize: number
  blob: Blob
}

const FORMAT_OPTIONS = ['jpeg', 'png', 'webp'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<ColorAdjustOptions>({
    temperature: '0',
    tint: '0',
    exposure: '0',
    format: 'png',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ColorAdjustOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('colorAdjust.error.unsupported'))
        const temperature = parseColorValue(opts.temperature)
        const tint = parseColorValue(opts.tint)
        const exposure = parseColorValue(opts.exposure)
        const img = await loadImageFromBlob(file)
        const canvas = drawScaled(img, img.width, img.height, img.width, img.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('colorAdjust.error.noCtx'))
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const out = adjustPixels(
          imageData.data,
          canvas.width,
          canvas.height,
          temperature,
          tint,
          exposure,
        )
        ctx.putImageData(new ImageData(out, canvas.width, canvas.height), 0, 0)
        const mime = formatToMime(opts.format)
        const blob = await canvasToBlob(canvas, mime)
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.format),
          width: canvas.width,
          height: canvas.height,
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
    (patch: Partial<ColorAdjustOptions>) => {
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
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('colorAdjust.note')}</p>

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
          {fileName ? fileName : t('colorAdjust.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('colorAdjust.temperature')}
          <input
            data-testid="opt-temperature"
            type="number"
            min={-100}
            max={100}
            value={options.temperature}
            onChange={(e) => handleOptionChange({ temperature: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('colorAdjust.tint')}
          <input
            data-testid="opt-tint"
            type="number"
            min={-100}
            max={100}
            value={options.tint}
            onChange={(e) => handleOptionChange({ tint: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('colorAdjust.exposure')}
          <input
            data-testid="opt-exposure"
            type="number"
            min={-100}
            max={100}
            value={options.exposure}
            onChange={(e) => handleOptionChange({ exposure: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('colorAdjust.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ColorAdjustOptions['format'] })
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
            {t('colorAdjust.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('colorAdjust.processing')}</p>}
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
                {t('colorAdjust.original')} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('colorAdjust.adjusted')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('colorAdjust.stats', {
              w: String(result.width),
              h: String(result.height),
              orig: formatBytes(result.origSize),
              out: formatBytes(result.newSize),
            })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('colorAdjust.download')}
          </button>
        </div>
      )}
    </div>
  )
}
