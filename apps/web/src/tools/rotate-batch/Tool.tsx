import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  MAX_CONCURRENCY,
  MAX_FILES,
  assertFileSizeOk,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseOptions,
  rotatedSize,
} from './utils'
import type { ParsedRotateOptions } from './utils'
import type { RotateBatchOptions } from './schema'
import { ANGLE_PRESETS } from './schema'

type ItemStatus = 'pending' | 'processing' | 'done' | 'error'

interface BatchItemBase {
  id: number
  file: File
}

/** 判别联合：done 必带 url/blob/outName，error 必带 error，渲染时无需空守卫 */
type BatchItem =
  | (BatchItemBase & { status: 'pending' | 'processing' })
  | (BatchItemBase & { status: 'done'; url: string; blob: Blob; outName: string })
  | (BatchItemBase & { status: 'error'; error: string })

const FORMATS = ['jpeg', 'png', 'webp'] as const

/**
 * 在 canvas 上旋转绘制并返回画布：画布尺寸按旋转包络矩形计算（90° 奇数倍时
 * 宽高精确互换），图片居中后 translate + rotate + drawImage。
 * 旋转绘制需要 2D 上下文，放在组件层；几何计算走 utils.rotatedSize（纯函数可单测）。
 */
function drawRotated(img: HTMLImageElement, angle: number): HTMLCanvasElement {
  const { width, height } = rotatedSize(img.width, img.height, angle)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  ctx.translate(width / 2, height / 2)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.drawImage(img, -img.width / 2, -img.height / 2)
  return canvas
}

export default function Tool() {
  const t = useTranslate()
  const idRef = useRef(0)
  const cancelRef = useRef(false)
  const [dragOver, setDragOver] = useState(false)
  const [items, setItems] = useState<BatchItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<RotateBatchOptions>({
    angle: '90',
    format: 'jpeg',
    quality: '90',
  })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const picked = files ? Array.from(files) : []
      if (picked.length === 0) return
      if (picked.length > MAX_FILES) {
        setError(t('rotateBatch.error.tooMany'))
        return
      }
      // 换新一批文件：停掉可能还在跑的上一轮，并释放旧结果 URL
      cancelRef.current = true
      setItems((prev) => {
        prev.forEach((it) => {
          if (it.status === 'done') URL.revokeObjectURL(it.url)
        })
        return picked.map((file): BatchItem => ({ id: idRef.current++, file, status: 'pending' }))
      })
      setError(null)
      setProcessing(false)
    },
    [t],
  )

  const handleProcess = useCallback(async () => {
    const snapshot = items
    if (snapshot.length === 0) {
      setError(t('rotateBatch.error.noFiles'))
      return
    }
    // 统一角度选项解析一次，非法即全局报错，不开始处理
    let parsed: ParsedRotateOptions
    try {
      parsed = parseOptions(options)
    } catch (err) {
      setError(errorMessage(err))
      return
    }
    cancelRef.current = false
    // 释放上一轮结果 URL，全部回到等待态
    setItems((prev) =>
      prev.map((it): BatchItem => {
        if (it.status === 'done') URL.revokeObjectURL(it.url)
        return { id: it.id, file: it.file, status: 'pending' }
      }),
    )
    setError(null)
    setProcessing(true)
    // 简单工作池：最多 MAX_CONCURRENCY 个 worker 抢下标，单张大图 Canvas
    // 位图可达数百 MB，限并发保证内存峰值可控
    let next = 0
    const worker = async (): Promise<void> => {
      while (!cancelRef.current) {
        const idx = next
        next += 1
        if (idx >= snapshot.length) return
        setItems((prev) =>
          prev.map((it, i): BatchItem =>
            i === idx ? { id: it.id, file: it.file, status: 'processing' } : it,
          ),
        )
        try {
          const file = snapshot[idx].file
          assertFileSizeOk(file.size)
          if (!isSupportedImageFile(file)) {
            throw new Error(t('rotateBatch.error.unsupported'))
          }
          const img = await loadImageFromBlob(file)
          const canvas = drawRotated(img, parsed.angle)
          const mime = formatToMime(parsed.format)
          const blob = await canvasToBlob(
            canvas,
            mime,
            effectiveQuality(parsed.format, parsed.quality),
          )
          const url = URL.createObjectURL(blob)
          if (cancelRef.current) {
            // 取消后才完成：丢弃结果，及时释放 URL
            URL.revokeObjectURL(url)
            return
          }
          const outName = buildOutputFileName(file.name, parsed.format)
          setItems((prev) =>
            prev.map((it, i): BatchItem =>
              i === idx ? { id: it.id, file: it.file, status: 'done', url, blob, outName } : it,
            ),
          )
        } catch (err) {
          setItems((prev) =>
            prev.map((it, i): BatchItem =>
              i === idx
                ? { id: it.id, file: it.file, status: 'error', error: errorMessage(err) }
                : it,
            ),
          )
        }
      }
    }
    const workers: Promise<void>[] = []
    for (let w = 0; w < Math.min(MAX_CONCURRENCY, snapshot.length); w++) workers.push(worker())
    await Promise.all(workers)
    setProcessing(false)
  }, [items, options, t])

  const handleCancel = useCallback(() => {
    cancelRef.current = true
    // 等待中的项直接标为已取消；处理中的项完成后丢弃结果
    setItems((prev) =>
      prev.map((it): BatchItem =>
        it.status === 'pending'
          ? {
              id: it.id,
              file: it.file,
              status: 'error',
              error: t('rotateBatch.error.cancelled'),
            }
          : it,
      ),
    )
  }, [t])

  const handleOptionChange = useCallback((patch: Partial<RotateBatchOptions>) => {
    // 批量模式不自动重处理：用户改完设置后点「开始处理」统一应用
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  // 快捷角度：直接把统一角度设为该值（批量版一次应用，不做连续累加）
  const handlePreset = useCallback((deg: number) => {
    setOptions((prev) => ({ ...prev, angle: String(deg) }))
  }, [])

  const handleReset = useCallback(() => {
    cancelRef.current = true
    setItems((prev) => {
      prev.forEach((it) => {
        if (it.status === 'done') URL.revokeObjectURL(it.url)
      })
      return []
    })
    setError(null)
    setProcessing(false)
    setInputKey((k) => k + 1)
  }, [])

  const statusOf = (status: ItemStatus): string => {
    switch (status) {
      case 'pending':
        return t('rotateBatch.status.pending')
      case 'processing':
        return t('rotateBatch.status.processing')
      case 'done':
        return t('rotateBatch.status.done')
      case 'error':
        return t('rotateBatch.status.error')
    }
  }

  const finished = items.filter((it) => it.status === 'done' || it.status === 'error').length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('rotateBatch.note')}</p>

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
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {items.length > 0 ? (
            <>
              {t('rotateBatch.filesSelected')}：{items.length}
            </>
          ) : (
            t('rotateBatch.dropHint')
          )}
        </p>
      </label>

      {/* 快捷角度：统一角度预设，点击即设定（不累加） */}
      <div data-testid="opt-angle-preset" className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {t('rotateBatch.preset')}
        </span>
        {ANGLE_PRESETS.map((p) => (
          <button
            key={p}
            data-testid={`opt-angle-preset-${p}`}
            type="button"
            onClick={() => handlePreset(p)}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {p}°
          </button>
        ))}
      </div>

      {/* 选项：统一设置，一次应用到全部图片 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('rotateBatch.angle')}
          <input
            data-testid="opt-angle"
            type="number"
            min={-360}
            max={360}
            step="any"
            value={options.angle}
            onChange={(e) => handleOptionChange({ angle: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
          <span className="text-xs text-slate-500">{t('rotateBatch.angleHint')}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('rotateBatch.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as RotateBatchOptions['format'] })
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
          {t('rotateBatch.quality')}
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
        <button
          data-testid="process"
          type="button"
          onClick={() => void handleProcess()}
          className="rounded bg-blue-600 px-4 py-1 text-sm text-white hover:bg-blue-700"
        >
          {t('rotateBatch.process')}
        </button>
        {processing && (
          <button
            data-testid="cancel"
            type="button"
            onClick={handleCancel}
            className="rounded border border-red-300 px-4 py-1 text-sm text-red-600 dark:border-red-700 dark:text-red-400"
          >
            {t('rotateBatch.cancel')}
          </button>
        )}
        {items.length > 0 && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('rotateBatch.reset')}
          </button>
        )}
      </div>

      {/* 逐项进度：n/N 文本 + 进度条 */}
      {items.length > 0 && (
        <div data-testid="progress" className="flex flex-col gap-1">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('rotateBatch.progress')}：{finished} / {items.length}
          </p>
          <div
            className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-label={t('rotateBatch.progress')}
            aria-valuemin={0}
            aria-valuemax={items.length}
            aria-valuenow={finished}
          >
            <div
              className="h-full rounded bg-blue-600 transition-all"
              style={{ width: `${(finished / items.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果列表：缩略图 + 每项状态 + 逐项下载 */}
      {items.length > 0 && (
        <div data-testid="result-list" className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t('rotateBatch.resultList')}</h3>
          <ul className="flex flex-col gap-2">
            {items.map((it, index) => (
              <li
                key={it.id}
                data-testid={`item-${index}`}
                data-status={it.status}
                className="flex items-center gap-3 rounded border border-slate-200 p-2 dark:border-slate-700"
              >
                {it.status === 'done' ? (
                  <img src={it.url} alt="" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
                    {formatBytes(it.file.size)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{it.file.name}</p>
                  <p className="text-xs text-slate-500">
                    {statusOf(it.status)}
                    {it.status === 'error' ? `：${it.error}` : ''}
                  </p>
                </div>
                {it.status === 'done' && (
                  <button
                    data-testid={`download-${index}`}
                    type="button"
                    // done 分支已收窄，blob/outName 必存在，无需空守卫
                    onClick={() => downloadBlob(it.blob, it.outName)}
                    className="shrink-0 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    {t('rotateBatch.download')}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
