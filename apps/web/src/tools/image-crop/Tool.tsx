import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey, MessageParams, Translate } from '../../i18n'
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
  applyAspectRatio,
  assertFileSizeOk,
  buildOutputFileName,
  centerSquareRect,
  clampRectToImage,
  effectiveQuality,
  errorMessage,
  formatToMime,
  maxRect,
  parseCropNumber,
  parseQuality,
  rectToPercentStyle,
} from './utils'
import type { AspectPreset, CropRect, OutputFormat } from './utils'
import type { ImageCropOptions } from './schema'

/**
 * i18n 取值包装：本工具的 imageCrop.* 键由协调员统一合并进 messages.* 后再生效；
 * 合并前经 MessageKey 收窄调用，保持 tsc 通过。合并后可改为直接 t('imageCrop.x')。
 */
function tx(t: Translate, key: string, params?: MessageParams): string {
  return t(key as MessageKey, params)
}

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  format: OutputFormat
  size: number
  blob: Blob
}

const ASPECT_OPTIONS: readonly AspectPreset[] = ['free', '1:1', '4:3', '3:4', '16:9', '9:16']
const FORMAT_OPTIONS: readonly OutputFormat[] = ['jpeg', 'png', 'webp']

const INITIAL_OPTIONS: ImageCropOptions = {
  aspectRatio: 'free',
  x: '',
  y: '',
  width: '',
  height: '',
  format: 'jpeg',
  quality: '80',
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  // 原图预览与尺寸合并为一个状态，避免渲染时出现分支
  const [preview, setPreview] = useState<{ url: string; w: number; h: number } | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<ImageCropOptions>(INITIAL_OPTIONS)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ImageCropOptions, initRect: boolean) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(tx(t, 'imageCrop.error.unsupported'))
        const quality = parseQuality(opts.quality)
        const img = await loadImageFromBlob(file)
        // 首次上传时矩形字段为空，默认取最大区域
        let next = opts
        if (initRect) {
          const r = maxRect(img.width, img.height)
          next = {
            ...opts,
            x: String(r.x),
            y: String(r.y),
            width: String(r.width),
            height: String(r.height),
          }
          setOptions(next)
        }
        const rect = clampRectToImage(
          {
            x: parseCropNumber(next.x),
            y: parseCropNumber(next.y),
            width: parseCropNumber(next.width),
            height: parseCropNumber(next.height),
          },
          img.width,
          img.height,
        )
        const canvas = createCanvas(rect.width, rect.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(tx(t, 'imageCrop.error.noCanvas'))
        ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)
        const mime = formatToMime(next.format)
        const blob = await canvasToBlob(canvas, mime, effectiveQuality(next.format, quality))
        const url = URL.createObjectURL(blob)
        const previewUrl = await readFileAsDataURL(file)
        setPreview({ url: previewUrl, w: img.width, h: img.height })
        setResult({
          url,
          fileName: buildOutputFileName(file.name, next.format),
          width: rect.width,
          height: rect.height,
          format: next.format,
          size: blob.size,
          blob,
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
      const file = files?.[0]
      if (!file) return
      void processFile(file, options, true)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<ImageCropOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next, false)
    },
    [options, processFile],
  )

  const handleAspectChange = useCallback(
    (preset: AspectPreset) => {
      let patch: Partial<ImageCropOptions> = { aspectRatio: preset }
      if (preview) {
        try {
          const rect = applyAspectRatio(
            {
              x: parseCropNumber(options.x),
              y: parseCropNumber(options.y),
              width: parseCropNumber(options.width),
              height: parseCropNumber(options.height),
            },
            preset,
            preview.w,
            preview.h,
          )
          patch = {
            ...patch,
            x: String(rect.x),
            y: String(rect.y),
            width: String(rect.width),
            height: String(rect.height),
          }
        } catch {
          // 当前矩形非法时只切换预设，保留原输入值
        }
      }
      handleOptionChange(patch)
    },
    [preview, options, handleOptionChange],
  )

  const applyQuickRect = useCallback(
    (rect: CropRect) => {
      handleOptionChange({
        x: String(rect.x),
        y: String(rect.y),
        width: String(rect.width),
        height: String(rect.height),
      })
    },
    [handleOptionChange],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setPreview(null)
    setFileName('')
    setError(null)
    setOptions(INITIAL_OPTIONS)
  }, [])

  // 遮罩：由当前矩形输入解析、钳制后转百分比；非法时不显示
  let maskStyle: { left: string; top: string; width: string; height: string } | null = null
  if (preview) {
    try {
      const rect = clampRectToImage(
        {
          x: parseCropNumber(options.x),
          y: parseCropNumber(options.y),
          width: parseCropNumber(options.width),
          height: parseCropNumber(options.height),
        },
        preview.w,
        preview.h,
      )
      maskStyle = rectToPercentStyle(rect, preview.w, preview.h)
    } catch {
      maskStyle = null
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{tx(t, 'imageCrop.note')}</p>

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
          {fileName ? fileName : tx(t, 'imageCrop.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {tx(t, 'imageCrop.aspectRatio')}
          <select
            data-testid="opt-aspect"
            value={options.aspectRatio}
            onChange={(e) => handleAspectChange(e.target.value as AspectPreset)}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {ASPECT_OPTIONS.map((a) => (
              <option key={a} value={a}>
                {a === 'free' ? tx(t, 'imageCrop.aspectFree') : a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tx(t, 'imageCrop.cropX')}
          <input
            data-testid="opt-x"
            type="number"
            min={0}
            value={options.x}
            onChange={(e) => handleOptionChange({ x: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tx(t, 'imageCrop.cropY')}
          <input
            data-testid="opt-y"
            type="number"
            min={0}
            value={options.y}
            onChange={(e) => handleOptionChange({ y: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tx(t, 'imageCrop.cropWidth')}
          <input
            data-testid="opt-width"
            type="number"
            min={0}
            value={options.width}
            onChange={(e) => handleOptionChange({ width: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tx(t, 'imageCrop.cropHeight')}
          <input
            data-testid="opt-height"
            type="number"
            min={0}
            value={options.height}
            onChange={(e) => handleOptionChange({ height: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tx(t, 'imageCrop.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ImageCropOptions['format'] })
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
          {tx(t, 'imageCrop.quality')}
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
        {(result ?? preview) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {tx(t, 'imageCrop.reset')}
          </button>
        )}
      </div>

      {/* 快捷选区：有原图尺寸时才渲染 */}
      {preview && (
        <div className="flex gap-2">
          <button
            data-testid="quick-center-square"
            type="button"
            onClick={() => applyQuickRect(centerSquareRect(preview.w, preview.h))}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {tx(t, 'imageCrop.quickCenterSquare')}
          </button>
          <button
            data-testid="quick-max"
            type="button"
            onClick={() => applyQuickRect(maxRect(preview.w, preview.h))}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {tx(t, 'imageCrop.quickMax')}
          </button>
        </div>
      )}

      {processing && <p data-testid="processing">{tx(t, 'imageCrop.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 原图 + 裁剪区域遮罩 */}
      {preview && (
        <figure>
          <figcaption className="mb-1 text-sm text-slate-500">
            {tx(t, 'imageCrop.original')} ({preview.w}×{preview.h})
          </figcaption>
          <div className="relative inline-block">
            <img
              src={preview.url}
              alt=""
              className="block max-h-64 w-auto rounded border object-contain"
            />
            {maskStyle && (
              <div
                data-testid="crop-mask"
                className="pointer-events-none absolute border-2 border-blue-500 bg-blue-500/20"
                style={maskStyle}
              />
            )}
          </div>
        </figure>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {tx(t, 'imageCrop.cropped')}
            </figcaption>
            <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
          </figure>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {tx(t, 'imageCrop.stats', {
              w: String(result.width),
              h: String(result.height),
              format: result.format.toUpperCase(),
              size: formatBytes(result.size),
            })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {tx(t, 'imageCrop.download')}
          </button>
        </div>
      )}
    </div>
  )
}
