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
  MAX_PROBE_ITERATIONS,
  QUALITY_MAX,
  QUALITY_MIN,
  assertFileSizeOk,
  attemptSummaryText,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  narrowQualityRange,
  needsResize,
  nextQualityProbe,
  parseTargetSize,
  shrinkForRetry,
  unreachableErrorText,
} from './utils'
import type { CompressSizeOptions } from './schema'

interface ProbeBest {
  quality: number
  blob: Blob
}

interface Result {
  url: string
  fileName: string
  previewUrl: string
  width: number
  height: number
  origSize: number
  newSize: number
  targetBytes: number
  attempts: number
  quality: number
  /** true=原图已 ≤ 目标，原样输出，未做任何压缩 */
  skipped: boolean
  blob: Blob
}

const FORMAT_OPTIONS = ['jpeg', 'webp'] as const

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<CompressSizeOptions>({ format: 'jpeg', targetSize: '500' })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: CompressSizeOptions) => {
      setProcessing(true)
      setError(null)
      setResult(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('compressSize.error.unsupported'))
        const targetBytes = parseTargetSize(opts.targetSize)
        const img = await loadImageFromBlob(file)
        const mime = formatToMime(opts.format)
        const previewUrl = await readFileAsDataURL(file)
        const outName = buildOutputFileName(file.name, opts.format)

        // 目标 ≥ 原图大小：无需压缩，原样输出
        if (file.size <= targetBytes) {
          setResult({
            url: URL.createObjectURL(file),
            fileName: outName,
            previewUrl,
            width: img.width,
            height: img.height,
            origSize: file.size,
            newSize: file.size,
            targetBytes,
            attempts: 0,
            quality: 100,
            skipped: true,
            blob: file,
          })
          return
        }

        // 两阶段：先对质量 1–100 二分逼近；质量=1 仍超标则缩小尺寸后重新二分
        // （最多 3 轮，面积每次 ×0.7，保底 1px）。二分另有 20 次迭代上限防死循环。
        let w = img.width
        let h = img.height
        let shrinkRounds = 0
        let attempts = 0
        let best: ProbeBest | null = null
        for (;;) {
          const canvas = drawScaled(img, img.width, img.height, w, h)
          let low = QUALITY_MIN
          let high = QUALITY_MAX
          let iter = 0
          while (low <= high && iter < MAX_PROBE_ITERATIONS) {
            const q = nextQualityProbe(low, high)
            attempts += 1
            iter += 1
            const blob = await canvasToBlob(canvas, mime, q / 100)
            const hit = blob.size <= targetBytes
            if (hit) best = { quality: q, blob }
            const range = narrowQualityRange(low, high, q, hit)
            low = range.low
            high = range.high
          }
          if (best) break
          if (!needsResize(w, h, shrinkRounds)) break
          const next = shrinkForRetry(w, h)
          w = next.width
          h = next.height
          shrinkRounds += 1
        }
        if (!best) throw new Error(unreachableErrorText(targetBytes))

        setResult({
          url: URL.createObjectURL(best.blob),
          fileName: outName,
          previewUrl,
          width: w,
          height: h,
          origSize: file.size,
          newSize: best.blob.size,
          targetBytes,
          attempts,
          quality: best.quality,
          skipped: false,
          blob: best.blob,
        })
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
      setFileName(file.name)
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<CompressSizeOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile],
  )

  // 手动重新处理（无文件时为空操作）
  const handleReprocess = useCallback(() => {
    const file = fileRef.current?.files?.[0]
    if (file) void processFile(file, options)
  }, [options, processFile])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('compressSize.note')}</p>

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
          {fileName ? fileName : t('compressSize.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('compressSize.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as CompressSizeOptions['format'] })
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
          {t('compressSize.targetSize')}
          <input
            data-testid="opt-target"
            type="number"
            min={1}
            max={51200}
            placeholder={t('compressSize.targetPlaceholder')}
            value={options.targetSize}
            onChange={(e) => handleOptionChange({ targetSize: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="text-slate-500">KB</span>
        </label>
        <button
          data-testid="process"
          type="button"
          onClick={handleReprocess}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        >
          {t('compressSize.process')}
        </button>
        {fileName !== '' && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('compressSize.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('compressSize.processing')}</p>}
      {/* 用 !== null 而非 truthy：i18n key 合并前 t() 返回 undefined，
          new Error(undefined).message 为空串，仍需渲染出错误位 */}
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
                {t('compressSize.original')} ({formatBytes(result.origSize)})
              </figcaption>
              <img
                src={result.previewUrl}
                alt=""
                className="max-h-64 rounded border object-contain"
              />
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('compressSize.compressed')} ({formatBytes(result.newSize)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {result.skipped ? (
              <>
                {t('compressSize.noNeed')}（{formatBytes(result.origSize)} ≤{' '}
                {formatBytes(result.targetBytes)}）
              </>
            ) : (
              <>
                {attemptSummaryText({
                  attempts: result.attempts,
                  quality: result.quality,
                  width: result.width,
                  height: result.height,
                  origSize: result.origSize,
                  newSize: result.newSize,
                })}
              </>
            )}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('compressSize.download')}
          </button>
        </div>
      )}
    </div>
  )
}
