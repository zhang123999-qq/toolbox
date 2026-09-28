import { useCallback, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
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
  DEFAULT_ANGLE,
  DEFAULT_COLOR,
  DEFAULT_FONT_SIZE,
  DEFAULT_MARGIN,
  DEFAULT_OPACITY,
  DEFAULT_QUALITY,
  assertFileSizeOk,
  buildOutputFileName,
  computePosition,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseAngle,
  parseFontSize,
  parseMargin,
  parseOpacity,
  parseQuality,
  parseWatermarkText,
  tileOrigins,
} from './utils'
import type { WatermarkOptions, WatermarkPosition } from './schema'
import { POSITIONS } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  origSize: number
  newSize: number
  blob: Blob
}

const FORMATS = ['jpeg', 'png', 'webp'] as const

/**
 * `watermark.*` i18n 键由父流程并入 i18n/messages.*.ts；合入后去掉此断言。
 * 组件内一律经 wk() 取键，保证 tsc 在合入前后都通过。
 */
const wk = (key: string): MessageKey => key as MessageKey

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 当前已选文件：选项变更时有文件才重处理；重置时清空
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [options, setOptions] = useState<WatermarkOptions>({
    text: '水印',
    fontSize: String(DEFAULT_FONT_SIZE),
    color: DEFAULT_COLOR,
    opacity: String(DEFAULT_OPACITY),
    position: 'bottom-right',
    angle: String(DEFAULT_ANGLE),
    tile: false,
    margin: String(DEFAULT_MARGIN),
    format: 'jpeg',
    quality: String(DEFAULT_QUALITY),
  })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: WatermarkOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t(wk('watermark.error.unsupported')))
        const text = parseWatermarkText(opts.text)
        const fontSize = parseFontSize(opts.fontSize)
        const opacity = parseOpacity(opts.opacity)
        const angle = parseAngle(opts.angle)
        const margin = parseMargin(opts.margin)
        const quality = parseQuality(opts.quality)
        const img = await loadImageFromBlob(file)
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D 上下文不可用')
        ctx.drawImage(img, 0, 0)
        // 文本度量需要 canvas：宽取 measureText，高约 1.2 倍字号
        ctx.font = `${fontSize}px sans-serif`
        const textW = ctx.measureText(text).width
        const textH = fontSize * 1.2
        ctx.save()
        ctx.globalAlpha = opacity / 100
        ctx.fillStyle = opts.color
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        const radians = (angle * Math.PI) / 180
        if (opts.tile) {
          // 平铺：间距 = 字号 * 2
          const step = fontSize * 2
          const origins = tileOrigins(canvas.width, canvas.height, step, step)
          for (const o of origins) {
            ctx.save()
            ctx.translate(o.x, o.y)
            ctx.rotate(radians)
            ctx.fillText(text, 0, 0)
            ctx.restore()
          }
        } else {
          const p = computePosition(
            canvas.width,
            canvas.height,
            textW,
            textH,
            opts.position,
            margin,
          )
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(radians)
          ctx.fillText(text, 0, 0)
          ctx.restore()
        }
        ctx.restore()
        const mime = formatToMime(opts.format)
        const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format, quality))
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
      setCurrentFile(file)
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<WatermarkOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      if (currentFile) void processFile(currentFile, next)
    },
    [options, processFile, currentFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setCurrentFile(null)
    setResult(null)
    setPreviewUrl(null)
    setFileName('')
    setError(null)
  }, [])

  const positionLabels: Record<WatermarkPosition, string> = {
    'top-left': t(wk('watermark.pos.topLeft')),
    'top-center': t(wk('watermark.pos.topCenter')),
    'top-right': t(wk('watermark.pos.topRight')),
    'middle-left': t(wk('watermark.pos.middleLeft')),
    center: t(wk('watermark.pos.center')),
    'middle-right': t(wk('watermark.pos.middleRight')),
    'bottom-left': t(wk('watermark.pos.bottomLeft')),
    'bottom-center': t(wk('watermark.pos.bottomCenter')),
    'bottom-right': t(wk('watermark.pos.bottomRight')),
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t(wk('watermark.note'))}</p>

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
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t(wk('watermark.dropHint'))}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.text'))}
          <input
            data-testid="opt-text"
            type="text"
            value={options.text}
            onChange={(e) => handleOptionChange({ text: e.target.value })}
            className="w-32 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.fontSize'))}
          <input
            data-testid="opt-size"
            type="number"
            min={8}
            max={500}
            value={options.fontSize}
            onChange={(e) => handleOptionChange({ fontSize: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.color'))}
          <input
            data-testid="opt-color"
            type="color"
            value={options.color}
            onChange={(e) => handleOptionChange({ color: e.target.value })}
            className="h-8 w-12 rounded border border-slate-300 dark:border-slate-700"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.opacity'))}
          <input
            data-testid="opt-opacity"
            type="number"
            min={0}
            max={100}
            value={options.opacity}
            onChange={(e) => handleOptionChange({ opacity: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.position'))}
          <select
            data-testid="opt-position"
            value={options.position}
            onChange={(e) => handleOptionChange({ position: e.target.value as WatermarkPosition })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {positionLabels[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.angle'))}
          <input
            data-testid="opt-angle"
            type="number"
            min={-180}
            max={180}
            step="any"
            value={options.angle}
            onChange={(e) => handleOptionChange({ angle: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            data-testid="opt-tile"
            type="checkbox"
            checked={options.tile}
            onChange={(e) => handleOptionChange({ tile: e.target.checked })}
            className="rounded border-slate-300"
          />
          {t(wk('watermark.tile'))}
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.margin'))}
          <input
            data-testid="opt-margin"
            type="number"
            min={0}
            max={500}
            value={options.margin}
            onChange={(e) => handleOptionChange({ margin: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.format'))}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as WatermarkOptions['format'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t(wk('watermark.quality'))}
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
            {t(wk('watermark.reset'))}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t(wk('watermark.processing'))}</p>}
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
                {t(wk('watermark.original'))} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t(wk('watermark.watermarked'))} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t(wk('watermark.stats'), { w: String(result.width), h: String(result.height) })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t(wk('watermark.download'))}
          </button>
        </div>
      )}
    </div>
  )
}
