import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  drawWithFilter,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildBlurFilter,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseRadius,
} from './utils'
import type { BlurOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  origSize: number
  newSize: number
  radius: number
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
  const [options, setOptions] = useState<BlurOptions>({ radius: '10', format: 'png' })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: BlurOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('blur.error.unsupported'))
        const radius = parseRadius(opts.radius)
        const img = await loadImageFromBlob(file)
        const canvas = drawWithFilter(
          img,
          img.width,
          img.height,
          img.width,
          img.height,
          buildBlurFilter(radius),
        )
        const mime = formatToMime(opts.format)
        const blob = await canvasToBlob(canvas, mime)
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.format),
          width: img.width,
          height: img.height,
          origSize: file.size,
          newSize: blob.size,
          radius,
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
    (patch: Partial<BlurOptions>) => {
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
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('blur.note')}</p>

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
          {fileName ? fileName : t('blur.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('blur.radius')} (px)
          <input
            data-testid="opt-radius"
            type="number"
            min={0}
            max={50}
            value={options.radius}
            onChange={(e) => handleOptionChange({ radius: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('blur.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as BlurOptions['format'] })
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
            {t('blur.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('blur.processing')}</p>}
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
                {t('blur.original')} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('blur.blurred')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('blur.stats', {
              w: String(result.width),
              h: String(result.height),
              radius: String(result.radius),
            })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('blur.download')}
          </button>
        </div>
      )}
    </div>
  )
}
