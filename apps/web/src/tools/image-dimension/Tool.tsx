import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  DEFAULT_BG_COLOR,
  assertFileSizeOk,
  buildOutputFileName,
  computeContainLayout,
  computeCoverLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseBgColor,
  parseDimension,
  parseQuality,
} from './utils'
import type { ImageDimensionOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  origSize: number
  newSize: number
  blob: Blob
}

/** 预设：id 本身即"宽x高"，custom 表示自定义 */
const PRESET_IDS = ['1920x1080', '1280x720', '800x600', '512x512', '256x256'] as const
const CUSTOM_PRESET = 'custom'
const FORMAT_OPTIONS = ['jpeg', 'png', 'webp'] as const
const FIT_OPTIONS = ['contain', 'cover', 'stretch'] as const

/** 取 2d 上下文（取不到时抛错，由调用方 catch 统一展示） */
function getCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  return ctx
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [preset, setPreset] = useState<string>(PRESET_IDS[0])
  const [options, setOptions] = useState<ImageDimensionOptions>({
    width: '1920',
    height: '1080',
    fit: 'contain',
    bgColor: DEFAULT_BG_COLOR,
    format: 'jpeg',
    quality: '80',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ImageDimensionOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageDimension.error.unsupported'))
        const dstW = parseDimension(opts.width, t('imageDimension.width'))
        const dstH = parseDimension(opts.height, t('imageDimension.height'))
        const quality = parseQuality(opts.quality)
        const img = await loadImageFromBlob(file)
        const mime = formatToMime(opts.format)
        let canvas: HTMLCanvasElement
        if (opts.fit === 'contain') {
          const bg = parseBgColor(opts.bgColor)
          const { drawW, drawH, offsetX, offsetY } = computeContainLayout(
            img.width,
            img.height,
            dstW,
            dstH,
          )
          canvas = createCanvas(dstW, dstH)
          const ctx = getCtx(canvas)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.fillStyle = bg
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, img.width, img.height, offsetX, offsetY, drawW, drawH)
        } else if (opts.fit === 'cover') {
          const { srcX, srcY, srcW, srcH } = computeCoverLayout(img.width, img.height, dstW, dstH)
          canvas = createCanvas(dstW, dstH)
          const ctx = getCtx(canvas)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, canvas.width, canvas.height)
        } else {
          canvas = drawScaled(img, img.width, img.height, dstW, dstH)
        }
        const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format, quality))
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.format),
          width: dstW,
          height: dstH,
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
    (patch: Partial<ImageDimensionOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile],
  )

  /** 预设下拉：id 即"宽x高"，custom 保持当前宽高只切换标记 */
  const handlePresetChange = useCallback(
    (presetId: string) => {
      setPreset(presetId)
      if (presetId === CUSTOM_PRESET) return
      const [w, h] = presetId.split('x')
      handleOptionChange({ width: w, height: h })
    },
    [handleOptionChange],
  )

  /** 手动改宽高即视为自定义预设 */
  const handleDimensionChange = useCallback(
    (patch: { width?: string; height?: string }) => {
      setPreset(CUSTOM_PRESET)
      handleOptionChange(patch)
    },
    [handleOptionChange],
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
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageDimension.note')}</p>

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
          {fileName ? fileName : t('imageDimension.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageDimension.preset')}
          <select
            data-testid="opt-preset"
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {id.replace('x', ' × ')}
              </option>
            ))}
            <option value={CUSTOM_PRESET}>{t('imageDimension.presetCustom')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageDimension.width')}
          <input
            data-testid="opt-width"
            type="number"
            min={1}
            max={16384}
            value={options.width}
            onChange={(e) => handleDimensionChange({ width: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageDimension.height')}
          <input
            data-testid="opt-height"
            type="number"
            min={1}
            max={16384}
            value={options.height}
            onChange={(e) => handleDimensionChange({ height: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageDimension.fit')}
          <select
            data-testid="opt-fit"
            value={options.fit}
            onChange={(e) =>
              handleOptionChange({ fit: e.target.value as ImageDimensionOptions['fit'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {FIT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {t(`imageDimension.fit-${f}`)}
              </option>
            ))}
          </select>
        </label>
        {options.fit === 'contain' && (
          <label className="flex items-center gap-2 text-sm">
            {t('imageDimension.bgColor')}
            <input
              data-testid="opt-bgcolor"
              type="text"
              value={options.bgColor}
              placeholder={DEFAULT_BG_COLOR}
              onChange={(e) => handleOptionChange({ bgColor: e.target.value })}
              className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
            <span
              aria-hidden="true"
              className="inline-block h-5 w-5 rounded border border-slate-300"
              style={{ backgroundColor: options.bgColor }}
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          {t('imageDimension.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ImageDimensionOptions['format'] })
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
          {t('imageDimension.quality')}
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
        {(result ?? previewUrl) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageDimension.reset')}
          </button>
        )}
      </div>

      {options.fit === 'stretch' && (
        <p data-testid="stretch-warning" className="text-sm text-amber-600 dark:text-amber-400">
          {t('imageDimension.stretchWarning')}
        </p>
      )}

      {processing && <p data-testid="processing">{t('imageDimension.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：前后对比 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('imageDimension.original')} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img
                  data-testid="preview"
                  src={previewUrl}
                  alt=""
                  className="max-h-64 rounded border object-contain"
                />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('imageDimension.adjusted')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageDimension.targetSize')}
            {result.width}×{result.height}（{t('imageDimension.fileSize')}
            {formatBytes(result.origSize)} → {formatBytes(result.newSize)}）
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('imageDimension.download')}
          </button>
        </div>
      )}
    </div>
  )
}
