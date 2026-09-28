import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import GIF from 'gif.js'
import workerUrl from 'gif.js/dist/gif.worker.js?url'
import {
  createCanvas,
  downloadBlob,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  DEFAULT_DELAY,
  DEFAULT_QUALITY,
  DEFAULT_REPEAT,
  MIN_FRAMES,
  assertFileSizeOk,
  assertFrameLimit,
  buildOutputFileName,
  computeContainRect,
  errorMessage,
  parseDelay,
  parseQuality,
  parseRepeat,
  validateFrameCount,
  validateOutputSize,
} from './utils'
import type { GifMergeOptions } from './schema'

/** 一帧：文件 + 解码得到的尺寸 + 缩略图 URL */
interface Frame {
  id: number
  file: File
  name: string
  url: string
  width: number
  height: number
}

interface MergeResult {
  url: string
  blob: Blob
  fileName: string
  width: number
  height: number
  frames: number
}

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const gifRef = useRef<GIF | null>(null)
  const nextId = useRef(1)
  const [dragOver, setDragOver] = useState(false)
  const [frames, setFrames] = useState<Frame[]>([])
  const [options, setOptions] = useState<GifMergeOptions>({
    delay: String(DEFAULT_DELAY),
    repeat: String(DEFAULT_REPEAT),
    quality: String(DEFAULT_QUALITY),
  })
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [result, setResult] = useState<MergeResult | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  /** 中止进行中的合成任务（取消按钮 / 重新合成 / 卸载时调用） */
  const abortMerge = useCallback(() => {
    const g = gifRef.current
    gifRef.current = null
    if (g) g.abort()
    setProgress(null)
  }, [])

  // 卸载时中止未完成的合成任务，避免 Web Worker 泄漏
  useEffect(() => () => abortMerge(), [abortMerge])

  const addFiles = useCallback(
    async (list: FileList | File[] | null) => {
      const files = list ? Array.from(list) : []
      if (files.length === 0) return
      setError(null)
      try {
        assertFrameLimit(frames.length + files.length)
        for (const file of files) {
          assertFileSizeOk(file.size)
          if (!isSupportedImageFile(file)) throw new Error(t('gifMerge.error.unsupported'))
        }
        const decoded: Frame[] = []
        for (const file of files) {
          const img = await loadImageFromBlob(file)
          decoded.push({
            id: nextId.current++,
            file,
            name: file.name,
            url: URL.createObjectURL(file),
            width: img.width,
            height: img.height,
          })
        }
        setFrames((prev) => [...prev, ...decoded])
      } catch (err) {
        setError(errorMessage(err))
      }
    },
    [frames.length, t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      void addFiles(files)
    },
    [addFiles],
  )

  /** 上移/下移一帧（按钮在越界时已禁用，此处无需守卫分支） */
  const moveFrame = useCallback((id: number, dir: -1 | 1) => {
    setFrames((prev) => {
      const i = prev.findIndex((f) => f.id === id)
      const j = i + dir
      const next = prev.slice()
      const a = next[i]
      const b = next[j]
      next[i] = b
      next[j] = a
      return next
    })
  }, [])

  const removeFrame = useCallback((id: number) => {
    setFrames((prev) => {
      for (const f of prev) {
        if (f.id === id) URL.revokeObjectURL(f.url)
      }
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const handleReset = useCallback(() => {
    abortMerge()
    setFrames((prev) => {
      for (const f of prev) URL.revokeObjectURL(f.url)
      return []
    })
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    setError(null)
    setProgress(null)
    setInputKey((k) => k + 1)
  }, [abortMerge])

  const startMerge = useCallback(async () => {
    // 重新合成前先中止旧任务，避免并发编码
    abortMerge()
    setError(null)
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    try {
      validateFrameCount(frames.length)
      const delay = parseDelay(options.delay)
      const repeat = parseRepeat(options.repeat)
      const quality = parseQuality(options.quality)
      // 输出尺寸 = 第一帧尺寸（GIF 要求所有帧同尺寸）
      const first = frames[0]
      validateOutputSize(first.width, first.height)
      const { width, height } = first
      // 逐帧解码，按 contain 等比缩放居中绘制到统一尺寸 canvas
      const canvases: HTMLCanvasElement[] = []
      for (const frame of frames) {
        const img = await loadImageFromBlob(frame.file)
        const canvas = createCanvas(width, height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('gifMerge.error.noCanvas'))
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)
        const rect = computeContainRect(img.width, img.height, width, height)
        ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h)
        canvases.push(canvas)
      }
      const gif = new GIF({
        workers: 2,
        quality,
        width,
        height,
        workerScript: workerUrl,
        repeat,
      })
      gifRef.current = gif
      for (const canvas of canvases) {
        gif.addFrame(canvas, { delay, copy: true })
      }
      setProgress(0)
      await new Promise<void>((resolve) => {
        gif.on('progress', (p) => setProgress(p))
        gif.on('finished', (blob: Blob) => {
          gifRef.current = null
          const url = URL.createObjectURL(blob)
          setResult({
            url,
            blob,
            fileName: buildOutputFileName(first.name),
            width,
            height,
            frames: frames.length,
          })
          setProgress(null)
          resolve()
        })
        gif.on('abort', () => {
          gifRef.current = null
          setProgress(null)
          resolve()
        })
        gif.render()
      })
    } catch (err) {
      gifRef.current = null
      setError(errorMessage(err))
      setProgress(null)
    }
  }, [abortMerge, frames, options, t])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('gifMerge.note')}</p>

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
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {frames.length > 0
            ? t('gifMerge.frameCount', { n: String(frames.length) })
            : t('gifMerge.dropHint')}
        </p>
      </label>

      {/* 帧列表：缩略图 + 上移/下移/删除 */}
      {frames.length > 0 && (
        <div data-testid="frame-list" className="flex flex-col gap-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('gifMerge.firstFrameNote', {
              w: String(frames[0].width),
              h: String(frames[0].height),
            })}
          </p>
          {frames.map((f, index) => (
            <div
              key={f.id}
              data-testid="frame-item"
              className="flex items-center gap-3 rounded border border-slate-200 p-2 dark:border-slate-700"
            >
              <img src={f.url} alt={f.name} className="h-12 w-12 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{f.name}</p>
                <p className="text-xs text-slate-500">
                  {f.width}×{f.height} · {formatBytes(f.file.size)}
                </p>
              </div>
              <span className="text-xs text-slate-400">#{index + 1}</span>
              <div className="flex gap-1">
                <button
                  data-testid="frame-up"
                  type="button"
                  onClick={() => moveFrame(f.id, -1)}
                  disabled={index === 0}
                  className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('gifMerge.moveUp')}
                </button>
                <button
                  data-testid="frame-down"
                  type="button"
                  onClick={() => moveFrame(f.id, 1)}
                  disabled={index === frames.length - 1}
                  className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-700"
                >
                  {t('gifMerge.moveDown')}
                </button>
                <button
                  data-testid="frame-remove"
                  type="button"
                  onClick={() => removeFrame(f.id)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-red-600 disabled:opacity-40 dark:border-slate-700"
                >
                  {t('gifMerge.remove')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('gifMerge.delay')}
          <input
            data-testid="opt-delay"
            type="number"
            min={20}
            max={10000}
            value={options.delay}
            onChange={(e) => setOptions({ ...options, delay: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('gifMerge.repeat')}
          <input
            data-testid="opt-repeat"
            type="number"
            min={0}
            max={100}
            value={options.repeat}
            onChange={(e) => setOptions({ ...options, repeat: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('gifMerge.quality')}
          <input
            data-testid="opt-quality"
            type="number"
            min={1}
            max={20}
            value={options.quality}
            onChange={(e) => setOptions({ ...options, quality: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {frames.length > 0 && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('gifMerge.reset')}
          </button>
        )}
      </div>

      {/* 合成 / 取消 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid="merge"
          type="button"
          onClick={() => void startMerge()}
          disabled={frames.length < MIN_FRAMES || progress !== null}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {t('gifMerge.merge')}
        </button>
        {progress !== null && (
          <button
            data-testid="cancel"
            type="button"
            onClick={abortMerge}
            className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          >
            {t('gifMerge.cancel')}
          </button>
        )}
      </div>

      {/* 进度 */}
      {progress !== null && (
        <div data-testid="progress" className="flex flex-col gap-1">
          <div className="h-2 w-full rounded bg-slate-200 dark:bg-slate-700">
            <div
              data-testid="progress-bar"
              className="h-2 rounded bg-blue-600 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('gifMerge.merging', { p: String(Math.round(progress * 100)) })}
          </p>
        </div>
      )}

      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">{t('gifMerge.result')}</figcaption>
            <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
          </figure>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('gifMerge.stats', {
              w: String(result.width),
              h: String(result.height),
              n: String(result.frames),
            })}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('gifMerge.download')}
          </button>
        </div>
      )}
    </div>
  )
}
