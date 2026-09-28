import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  parseColors,
  parseMaxEdge,
  parseMinArea,
  scaledSize,
  vectorizeImage,
} from './utils'
import type { PngToSvgOptions } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  layerCount: number
  svgSize: number
  blob: Blob
  previewUrl: string
}

/** 颜色数选项：2–8 */
const COLOR_CHOICES = [2, 3, 4, 5, 6, 7, 8]

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<PngToSvgOptions>({
    colors: '4',
    maxEdge: '256',
    minArea: '4',
    keepBackground: 'off',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: PngToSvgOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('pngToSvg.error.unsupported'))
        const colors = parseColors(opts.colors)
        const maxEdge = parseMaxEdge(opts.maxEdge)
        const minArea = parseMinArea(opts.minArea)
        // 矢量化是同步重计算：先让出事件循环，保证「处理中」先渲染出来
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
        const img = await loadImageFromBlob(file)
        const { width, height } = scaledSize(img.width, img.height, maxEdge)
        const canvas = drawScaled(img, img.width, img.height, width, height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('pngToSvg.error.noCtx'))
        const imageData = ctx.getImageData(0, 0, width, height)
        const { svg, layerCount } = vectorizeImage(imageData.data, width, height, {
          colors,
          minArea,
          keepBackground: opts.keepBackground === 'on',
        })
        const blob = new Blob([svg], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name),
          width,
          height,
          layerCount,
          svgSize: blob.size,
          blob,
          previewUrl: preview,
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
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<PngToSvgOptions>) => {
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
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pngToSvg.note')}</p>

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
          {fileName ? fileName : t('pngToSvg.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pngToSvg.colors')}
          <select
            data-testid="opt-colors"
            value={options.colors}
            onChange={(e) => handleOptionChange({ colors: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {COLOR_CHOICES.map((c) => (
              <option key={c} value={String(c)}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pngToSvg.maxEdge')}
          <input
            data-testid="opt-maxedge"
            type="number"
            min={64}
            max={1024}
            value={options.maxEdge}
            onChange={(e) => handleOptionChange({ maxEdge: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pngToSvg.minArea')}
          <input
            data-testid="opt-minarea"
            type="number"
            min={0}
            value={options.minArea}
            onChange={(e) => handleOptionChange({ minArea: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pngToSvg.keepBackground')}
          <select
            data-testid="opt-keepbg"
            value={options.keepBackground}
            onChange={(e) =>
              handleOptionChange({
                keepBackground: e.target.value as PngToSvgOptions['keepBackground'],
              })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="off">{t('pngToSvg.keepOff')}</option>
            <option value="on">{t('pngToSvg.keepOn')}</option>
          </select>
        </label>
        {result && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pngToSvg.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('pngToSvg.processing')}</p>}
      {/* error 可能为空串（i18n key 合并前的 t() 回退），用 !== null 保证错误态可渲染 */}
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
                {t('pngToSvg.original')}
              </figcaption>
              <img
                src={result.previewUrl}
                alt=""
                className="max-h-64 rounded border object-contain"
              />
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('pngToSvg.vector')} ({formatBytes(result.svgSize)})
              </figcaption>
              <img
                src={result.url}
                alt=""
                className="max-h-64 rounded border bg-white object-contain"
              />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pngToSvg.statsLabel')}：{result.width}×{result.height} · {result.layerCount}
            {t('pngToSvg.layersUnit')} · SVG {formatBytes(result.svgSize)}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pngToSvg.download')}
          </button>
        </div>
      )}
    </div>
  )
}
