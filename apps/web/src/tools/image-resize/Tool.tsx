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
  MAX_PIXEL_LIMIT,
  assertFileSizeOk,
  buildOutputFileName,
  computePercentSize,
  computePixelSize,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parsePercent,
  parsePositiveInt,
  parseQuality,
} from './utils'
import type { ImageResizeOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  origWidth: number
  origHeight: number
  origSize: number
  newSize: number
  blob: Blob
}

interface SourceSize {
  width: number
  height: number
}

const FORMAT_OPTIONS = ['jpeg', 'png', 'webp'] as const

/**
 * 联动输入的安全解析：空串/非法/超限返回 undefined（不联动；
 * 输入错误在重处理时由 parsePositiveInt 抛出并展示）。
 */
function tryParseDimension(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  try {
    return parsePositiveInt(raw)
  } catch {
    return undefined
  }
}

export default function Tool() {
  // imageResize.* 文案键由集成阶段统一写入 i18n 消息文件（本工具任务禁止改动该文件），
  // 为通过 tsc 此处把 key 类型放宽；又因 translator 在「缺键 + 传 params」时会崩溃，
  // 本组件所有 t() 调用均不带 params（用 JSX 拼接代替占位符）。键补齐后可删掉这层转换。
  const t = useTranslate() as unknown as (key: string) => string | undefined
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  // 原图尺寸：锁定纵横比联动时必须按原图比例计算，不能用当前输出尺寸
  const [srcSize, setSrcSize] = useState<SourceSize | null>(null)
  const [options, setOptions] = useState<ImageResizeOptions>({
    mode: 'pixel',
    width: '',
    height: '',
    percent: '100',
    lock: 'true',
    format: 'jpeg',
    quality: '80',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ImageResizeOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageResize.error.unsupported'))
        const img = await loadImageFromBlob(file)
        const src = { width: img.width, height: img.height }
        setSrcSize(src)
        const dims =
          opts.mode === 'percent'
            ? computePercentSize(src.width, src.height, parsePercent(opts.percent))
            : computePixelSize(
                src.width,
                src.height,
                opts.width.trim() === '' ? undefined : parsePositiveInt(opts.width),
                opts.height.trim() === '' ? undefined : parsePositiveInt(opts.height),
                opts.lock === 'true',
              )
        const quality = parseQuality(opts.quality)
        const canvas = drawScaled(img, src.width, src.height, dims.width, dims.height)
        const mime = formatToMime(opts.format)
        const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format, quality))
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.format, dims.width, dims.height),
          width: dims.width,
          height: dims.height,
          origWidth: src.width,
          origHeight: src.height,
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
    (patch: Partial<ImageResizeOptions>) => {
      const next = { ...options, ...patch }
      // 锁定纵横比时：像素模式下改宽→按原图比例自动填高，改高→自动填宽
      if (next.mode === 'pixel' && next.lock === 'true' && srcSize !== null) {
        if (patch.width !== undefined) {
          const w = tryParseDimension(patch.width)
          if (w !== undefined) {
            next.height = String(
              computePixelSize(srcSize.width, srcSize.height, w, undefined, true).height,
            )
          }
        } else if (patch.height !== undefined) {
          const h = tryParseDimension(patch.height)
          if (h !== undefined) {
            next.width = String(
              computePixelSize(srcSize.width, srcSize.height, undefined, h, true).width,
            )
          }
        }
      }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile, srcSize],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setPreviewUrl(null)
    setSrcSize(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageResize.note')}</p>

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
          {fileName ? fileName : t('imageResize.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 text-sm">
          <span>{t('imageResize.mode')}</span>
          <span data-testid="opt-mode" className="flex items-center gap-3">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="image-resize-mode"
                checked={options.mode === 'pixel'}
                onChange={() => handleOptionChange({ mode: 'pixel' })}
              />
              {t('imageResize.modePixel')}
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="image-resize-mode"
                checked={options.mode === 'percent'}
                onChange={() => handleOptionChange({ mode: 'percent' })}
              />
              {t('imageResize.modePercent')}
            </label>
          </span>
        </div>
        {options.mode === 'pixel' ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              {t('imageResize.width')}
              <input
                data-testid="opt-width"
                type="number"
                min={1}
                max={MAX_PIXEL_LIMIT}
                value={options.width}
                onChange={(e) => handleOptionChange({ width: e.target.value })}
                className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
              {t('imageResize.px')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('imageResize.height')}
              <input
                data-testid="opt-height"
                type="number"
                min={1}
                max={MAX_PIXEL_LIMIT}
                value={options.height}
                onChange={(e) => handleOptionChange({ height: e.target.value })}
                className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
              {t('imageResize.px')}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                data-testid="opt-lock"
                type="checkbox"
                checked={options.lock === 'true'}
                onChange={(e) => handleOptionChange({ lock: e.target.checked ? 'true' : 'false' })}
              />
              {t('imageResize.lock')}
            </label>
          </>
        ) : (
          <label className="flex items-center gap-2 text-sm">
            {t('imageResize.percent')}
            <input
              data-testid="opt-percent"
              type="number"
              min={1}
              max={1000}
              step="any"
              value={options.percent}
              onChange={(e) => handleOptionChange({ percent: e.target.value })}
              className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
            %
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          {t('imageResize.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ImageResizeOptions['format'] })
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
          {t('imageResize.quality')}
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
            {t('imageResize.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('imageResize.processing')}</p>}
      {/* 集成前文案键缺失时错误消息可能为空串，用 !== null 保证错误态可渲染 */}
      {error !== null && (
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
                {t('imageResize.original')} ({formatBytes(result.origSize)})
              </figcaption>
              {previewUrl && (
                <img src={previewUrl} alt="" className="max-h-64 rounded border object-contain" />
              )}
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('imageResize.resized')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageResize.original')} {result.origWidth}×{result.origHeight}
            {' → '}
            {t('imageResize.resized')} {result.width}×{result.height}
            {'（'}
            {formatBytes(result.origSize)} → {formatBytes(result.newSize)}
            {'）'}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('imageResize.download')}
          </button>
        </div>
      )}
    </div>
  )
}
