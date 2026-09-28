import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  formatToMime,
  isRightAngle,
  normalizeAngle,
  parseAngle,
  parseQuality,
  rotatedBounds,
} from './utils'
import type { ImageRotateOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  angle: number
  format: string
  origSize: number
  newSize: number
  blob: Blob
}

const FORMAT_OPTIONS = ['jpeg', 'png', 'webp'] as const
/** 快捷旋转预设（顺时针），点击一次在当前角度上累加 */
const PRESETS = [90, 180, 270] as const
const DEFAULT_BACKGROUND = '#ffffff'

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<ImageRotateOptions>({
    angle: '',
    format: 'jpeg',
    quality: '90',
    backgroundColor: DEFAULT_BACKGROUND,
    transparent: false,
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ImageRotateOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageRotate.error.unsupported'))
        const angle = normalizeAngle(parseAngle(opts.angle))
        const quality = parseQuality(opts.quality)
        const img = await loadImageFromBlob(file)
        const { width, height } = rotatedBounds(img.width, img.height, angle)
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('imageRotate.error.noContext'))
        // PNG + 透明背景：不清屏，保持透明；直角旋转：图片恰好铺满画布，无需填充
        if (!(opts.format === 'png' && opts.transparent) && !isRightAngle(angle)) {
          ctx.fillStyle = opts.backgroundColor
          ctx.fillRect(0, 0, width, height)
        }
        ctx.translate(width / 2, height / 2)
        ctx.rotate((angle * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        const mime = formatToMime(opts.format)
        const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format, quality))
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.format),
          width,
          height,
          angle,
          format: opts.format,
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
    (patch: Partial<ImageRotateOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile],
  )

  // 快捷旋转：在当前角度上累加（归一化到 [0,360)），可连续点击；输入非法时从 0 起算
  const rotateBy = useCallback(
    (delta: number) => {
      let base: number
      try {
        base = parseAngle(options.angle)
      } catch {
        base = 0
      }
      handleOptionChange({ angle: String(normalizeAngle(base + delta)) })
    },
    [options.angle, handleOptionChange],
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
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageRotate.note')}</p>

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
          {fileName ? fileName : t('imageRotate.dropHint')}
        </p>
      </label>

      {/* 快捷旋转 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {t('imageRotate.preset')}
        </span>
        {PRESETS.map((p) => (
          <button
            key={p}
            data-testid={`btn-rot${p}`}
            type="button"
            onClick={() => rotateBy(p)}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageRotate.presetLabel', { deg: String(p) })}
          </button>
        ))}
      </div>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageRotate.angle')}
          <input
            data-testid="opt-angle"
            type="number"
            min={-360}
            max={360}
            step="any"
            placeholder={t('imageRotate.anglePlaceholder')}
            value={options.angle}
            onChange={(e) => handleOptionChange({ angle: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageRotate.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ImageRotateOptions['format'] })
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
        <label className="flex items-center gap-2 text-sm">
          {t('imageRotate.quality')}
          <input
            data-testid="opt-quality"
            type="number"
            min={1}
            max={100}
            value={options.quality}
            onChange={(e) => handleOptionChange({ quality: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageRotate.backgroundColor')}
          <input
            data-testid="opt-bgcolor"
            type="color"
            value={options.backgroundColor}
            onChange={(e) => handleOptionChange({ backgroundColor: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
          />
        </label>
        {options.format === 'png' && (
          <label className="flex items-center gap-2 text-sm">
            <input
              data-testid="opt-transparent"
              type="checkbox"
              checked={options.transparent}
              onChange={(e) => handleOptionChange({ transparent: e.target.checked })}
            />
            {t('imageRotate.transparent')}
          </label>
        )}
        {(result ?? previewUrl) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageRotate.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('imageRotate.processing')}</p>}
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
                {t('imageRotate.original')} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('imageRotate.rotated')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageRotate.stats', {
              w: String(result.width),
              h: String(result.height),
              angle: String(result.angle),
              format: result.format,
            })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('imageRotate.download')}
          </button>
        </div>
      )}
    </div>
  )
}
