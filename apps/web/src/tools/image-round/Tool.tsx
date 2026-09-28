import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey, Translate } from '../../i18n'
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
  circleDiameter,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseRadius,
  radiusToPx,
  resolveFillStyle,
} from './utils'
import type { ImageRoundOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  newSize: number
  blob: Blob
}

const MODE_OPTIONS = ['round', 'circle'] as const
const UNIT_OPTIONS = ['px', '%'] as const
const BACKGROUND_OPTIONS = ['transparent', 'white', 'custom'] as const
const FORMAT_OPTIONS = ['png', 'jpeg'] as const

/**
 * 本工具的 imageRound.* 文案键由仓库流程统一注册到 i18n/messages 文件后生效；
 * 此处先断言绕过「中文真源」的 MessageKey 类型约束，保证 tsc 通过。
 * 完整键值对（en+zh）见本工具 README 与交付报告，由父流程写入 messages 文件。
 * 不支持的图片类型错误复用已注册的 imageCompress.error.unsupported。
 */
function tr(t: Translate, key: string): string {
  return t(key as MessageKey)
}

/** 手写圆角矩形路径（arcTo），避免依赖 ctx.roundRect 的兼容性分支 */
function traceRoundRect(ctx: CanvasRenderingContext2D, w: number, h: number, r: number): void {
  const radius = Math.min(Math.max(0, r), w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(radius, 0)
  ctx.lineTo(w - radius, 0)
  ctx.arcTo(w, 0, w, radius, radius)
  ctx.lineTo(w, h - radius)
  ctx.arcTo(w, h, w - radius, h, radius)
  ctx.lineTo(radius, h)
  ctx.arcTo(0, h, 0, h - radius, radius)
  ctx.lineTo(0, radius)
  ctx.arcTo(0, 0, radius, 0, radius)
  ctx.closePath()
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
  const [options, setOptions] = useState<ImageRoundOptions>({
    mode: 'round',
    radius: '20',
    radiusUnit: 'px',
    background: 'transparent',
    customColor: '#ffffff',
    format: 'png',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ImageRoundOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageCompress.error.unsupported'))
        const img = await loadImageFromBlob(file)
        const isCircle = opts.mode === 'circle'
        let outW = img.width
        let outH = img.height
        let radiusPx = 0
        let diameter = 0
        if (isCircle) {
          // 圆形：以中心为圆心、直径=短边的内切圆裁剪，输出正方形
          diameter = circleDiameter(img.width, img.height)
          outW = diameter
          outH = diameter
        } else {
          radiusPx = radiusToPx(
            parseRadius(opts.radius, opts.radiusUnit),
            opts.radiusUnit,
            img.width,
            img.height,
          )
        }
        const canvas = createCanvas(outW, outH)
        const ctx = canvas.getContext('2d')
        // 字面量错误（非常见路径）：utils 风格，不走 i18n，保证单测确定性
        if (!ctx) throw new Error('Canvas 2D 上下文不可用')
        // 先填背景色；透明背景（仅 PNG）不清屏，canvas 默认全透明
        const fill = resolveFillStyle(opts.background, opts.customColor, opts.format)
        if (fill === null) {
          // 保持透明，无需填充
        } else {
          ctx.fillStyle = fill
          ctx.fillRect(0, 0, outW, outH)
        }
        ctx.save()
        if (isCircle) {
          ctx.beginPath()
          ctx.arc(outW / 2, outH / 2, diameter / 2, 0, Math.PI * 2)
        } else {
          traceRoundRect(ctx, outW, outH, radiusPx)
        }
        ctx.clip()
        // 圆形取原图中心正方形区域绘制；圆角模式整图绘制
        const sx = isCircle ? (img.width - diameter) / 2 : 0
        const sy = isCircle ? (img.height - diameter) / 2 : 0
        const sw = isCircle ? diameter : img.width
        const sh = isCircle ? diameter : img.height
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH)
        ctx.restore()
        const mime = formatToMime(opts.format)
        const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format))
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.format),
          width: outW,
          height: outH,
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
    (patch: Partial<ImageRoundOptions>) => {
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

  // 透明背景 + JPEG：JPEG 无 alpha 通道，按白色填充并提示用户
  const showJpegHint = options.background === 'transparent' && options.format === 'jpeg'

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{tr(t, 'imageRound.note')}</p>

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
          {fileName ? fileName : tr(t, 'imageRound.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {tr(t, 'imageRound.mode')}
          <select
            data-testid="opt-mode"
            value={options.mode}
            onChange={(e) =>
              handleOptionChange({ mode: e.target.value as ImageRoundOptions['mode'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {MODE_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {tr(t, `imageRound.mode.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tr(t, 'imageRound.radius')}
          <input
            data-testid="opt-radius"
            type="number"
            min={0}
            placeholder="0"
            value={options.radius}
            // 圆形模式不需要半径，禁用输入（无死分支：属性始终求值）
            disabled={options.mode === 'circle'}
            onChange={(e) => handleOptionChange({ radius: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
          />
          <select
            data-testid="opt-radius-unit"
            value={options.radiusUnit}
            onChange={(e) =>
              handleOptionChange({ radiusUnit: e.target.value as ImageRoundOptions['radiusUnit'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tr(t, 'imageRound.background')}
          <select
            data-testid="opt-background"
            value={options.background}
            onChange={(e) =>
              handleOptionChange({ background: e.target.value as ImageRoundOptions['background'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {BACKGROUND_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {tr(t, `imageRound.background.${b}`)}
              </option>
            ))}
          </select>
        </label>
        {options.background === 'custom' && (
          <label className="flex items-center gap-2 text-sm">
            {tr(t, 'imageRound.customColor')}
            <input
              data-testid="opt-custom-color"
              type="color"
              value={options.customColor}
              onChange={(e) => handleOptionChange({ customColor: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          {tr(t, 'imageRound.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ImageRoundOptions['format'] })
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
        {result && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {tr(t, 'imageRound.reset')}
          </button>
        )}
      </div>

      {showJpegHint && (
        <p data-testid="jpeg-hint" className="text-sm text-amber-600 dark:text-amber-400">
          {tr(t, 'imageRound.hint.jpegTransparent')}
        </p>
      )}

      {processing && <p data-testid="processing">{tr(t, 'imageRound.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 原图预览（独立于结果，result 为空时也能看） */}
      {previewUrl && (
        <figure data-testid="preview-original">
          <figcaption className="mb-1 text-sm text-slate-500">
            {tr(t, 'imageRound.original')}
          </figcaption>
          <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
        </figure>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {tr(t, 'imageRound.rounded')} ({formatBytes(result.newSize)})
            </figcaption>
            <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
          </figure>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {tr(t, 'imageRound.stats')}
            {result.width}×{result.height}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {tr(t, 'imageRound.download')}
          </button>
        </div>
      )}
    </div>
  )
}
