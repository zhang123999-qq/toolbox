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
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  flipTransform,
  formatToMime,
  parseFlipOptions,
  parseQuality,
} from './utils'
import type { ImageFlipOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  origSize: number
  newSize: number
  blob: Blob
  modes: { horizontal: boolean; vertical: boolean }
}

const FORMAT_OPTIONS = ['jpeg', 'png', 'webp'] as const

/**
 * imageFlip.* 文案键由后续流程统一录入 i18n messages（zh/en），
 * 此处经 MessageKey 断言绕过「键必须已存在」的泛型约束，保证 tsc 通过。
 */
function tr(t: Translate, key: string, params?: MessageParams): string {
  return t(key as MessageKey, params)
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
  // 默认勾选水平翻转：首次上传即有可见结果；取消全选走校验报错分支
  const [options, setOptions] = useState<ImageFlipOptions>({
    flipH: true,
    flipV: false,
    format: 'jpeg',
    quality: '80',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ImageFlipOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(tr(t, 'imageFlip.error.unsupported'))
        // 两个都不勾选 → 校验抛错，禁止静默输出原图
        const flags = parseFlipOptions({ horizontal: opts.flipH, vertical: opts.flipV })
        const quality = parseQuality(opts.quality)
        const img = await loadImageFromBlob(file)
        const w = img.width
        const h = img.height
        const canvas = createCanvas(w, h)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D 上下文不可用')
        const { scaleX, scaleY } = flipTransform(flags)
        ctx.translate(w / 2, h / 2)
        ctx.scale(scaleX, scaleY)
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
        const mime = formatToMime(opts.format)
        const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format, quality))
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.format),
          width: w,
          height: h,
          origSize: file.size,
          newSize: blob.size,
          blob,
          modes: flags,
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
    (patch: Partial<ImageFlipOptions>) => {
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

  // 统计行里的翻转方式文案：至少其一非空（parseFlipOptions 已保证）
  const modesText = result
    ? [
        result.modes.horizontal ? tr(t, 'imageFlip.horizontal') : '',
        result.modes.vertical ? tr(t, 'imageFlip.vertical') : '',
      ]
        .filter((s) => s !== '')
        .join(' + ')
    : ''

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{tr(t, 'imageFlip.note')}</p>

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
          {fileName ? fileName : tr(t, 'imageFlip.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            data-testid="opt-h"
            type="checkbox"
            checked={options.flipH}
            onChange={(e) => handleOptionChange({ flipH: e.target.checked })}
            className="h-4 w-4 accent-blue-600"
          />
          {tr(t, 'imageFlip.horizontal')}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            data-testid="opt-v"
            type="checkbox"
            checked={options.flipV}
            onChange={(e) => handleOptionChange({ flipV: e.target.checked })}
            className="h-4 w-4 accent-blue-600"
          />
          {tr(t, 'imageFlip.vertical')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tr(t, 'imageFlip.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ImageFlipOptions['format'] })
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
          {tr(t, 'imageFlip.quality')}
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
            {tr(t, 'imageFlip.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{tr(t, 'imageFlip.processing')}</p>}
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
                {tr(t, 'imageFlip.original')} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {tr(t, 'imageFlip.flipped')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {tr(t, 'imageFlip.stats', {
              w: String(result.width),
              h: String(result.height),
              modes: modesText,
            })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {tr(t, 'imageFlip.download')}
          </button>
        </div>
      )}
    </div>
  )
}
