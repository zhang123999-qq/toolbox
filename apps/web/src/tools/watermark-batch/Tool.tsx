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
  fontPx,
  formatToMime,
  parseOptions,
  tileOrigins,
  tileSteps,
  watermarkPosition,
} from './utils'
import type { ParsedBatchOptions } from './utils'
import type { WatermarkBatchOptions, WatermarkBatchPosition } from './schema'
import { POSITIONS } from './schema'

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
 * 在 canvas 上绘制水印并返回画布（文本度量与旋转需要 2D 上下文，纯布局参数来自 utils）。
 * 字号按图片短边百分比自适应，同一设置可应用到不同尺寸的图片。
 */
function drawWatermarked(img: HTMLImageElement, opts: ParsedBatchOptions): HTMLCanvasElement {
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  ctx.drawImage(img, 0, 0)
  const fontSize = fontPx(Math.min(img.width, img.height), opts.fontSizePercent)
  ctx.font = `${fontSize}px sans-serif`
  // 文本度量需要 canvas：宽取 measureText，高约 1.2 倍字号
  const textW = ctx.measureText(opts.text).width
  const textH = fontSize * 1.2
  ctx.save()
  ctx.globalAlpha = opts.opacity / 100
  ctx.fillStyle = opts.color
  const radians = (opts.angle * Math.PI) / 180
  if (opts.tile) {
    // 平铺：步长随字号成比例，铺满整图
    const { stepX, stepY } = tileSteps(textW, textH)
    const origins = tileOrigins(canvas.width, canvas.height, stepX, stepY)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    for (const o of origins) {
      ctx.save()
      ctx.translate(o.x, o.y)
      ctx.rotate(radians)
      ctx.fillText(opts.text, 0, 0)
      ctx.restore()
    }
  } else {
    // 单个定位：九宫格锚点 + 对齐方式
    const a = watermarkPosition(canvas.width, canvas.height, opts.position)
    ctx.save()
    ctx.translate(a.x, a.y)
    ctx.rotate(radians)
    ctx.textAlign = a.textAlign
    ctx.textBaseline = a.textBaseline
    ctx.fillText(opts.text, 0, 0)
    ctx.restore()
  }
  ctx.restore()
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
  const [options, setOptions] = useState<WatermarkBatchOptions>({
    text: '水印',
    position: 'bottom-right',
    fontSize: '6',
    color: '#ffffff',
    opacity: '50',
    angle: '0',
    tile: false,
    format: 'jpeg',
    quality: '80',
  })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const picked = files ? Array.from(files) : []
      if (picked.length === 0) return
      if (picked.length > MAX_FILES) {
        setError(t('watermarkBatch.error.tooMany'))
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
      setError(t('watermarkBatch.error.noFiles'))
      return
    }
    // 选项统一解析一次，非法即全局报错，不开始处理
    let parsed: ParsedBatchOptions
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
            throw new Error(t('watermarkBatch.error.unsupported'))
          }
          const img = await loadImageFromBlob(file)
          const canvas = drawWatermarked(img, parsed)
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
              error: t('watermarkBatch.error.cancelled'),
            }
          : it,
      ),
    )
  }, [t])

  const handleOptionChange = useCallback((patch: Partial<WatermarkBatchOptions>) => {
    // 批量模式不自动重处理：用户改完设置后点「开始处理」统一应用
    setOptions((prev) => ({ ...prev, ...patch }))
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
        return t('watermarkBatch.status.pending')
      case 'processing':
        return t('watermarkBatch.status.processing')
      case 'done':
        return t('watermarkBatch.status.done')
      case 'error':
        return t('watermarkBatch.status.error')
    }
  }

  const positionLabels: Record<WatermarkBatchPosition, string> = {
    'top-left': t('watermarkBatch.pos.topLeft'),
    'top-center': t('watermarkBatch.pos.topCenter'),
    'top-right': t('watermarkBatch.pos.topRight'),
    'middle-left': t('watermarkBatch.pos.middleLeft'),
    center: t('watermarkBatch.pos.center'),
    'middle-right': t('watermarkBatch.pos.middleRight'),
    'bottom-left': t('watermarkBatch.pos.bottomLeft'),
    'bottom-center': t('watermarkBatch.pos.bottomCenter'),
    'bottom-right': t('watermarkBatch.pos.bottomRight'),
  }

  const finished = items.filter((it) => it.status === 'done' || it.status === 'error').length

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('watermarkBatch.note')}</p>

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
              {t('watermarkBatch.filesSelected')}：{items.length}
            </>
          ) : (
            t('watermarkBatch.dropHint')
          )}
        </p>
      </label>

      {/* 选项：统一设置，一次应用到全部图片 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('watermarkBatch.text')}
          <input
            data-testid="opt-text"
            type="text"
            value={options.text}
            onChange={(e) => handleOptionChange({ text: e.target.value })}
            className="w-32 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('watermarkBatch.position')}
          <select
            data-testid="opt-position"
            value={options.position}
            onChange={(e) =>
              handleOptionChange({ position: e.target.value as WatermarkBatchPosition })
            }
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
          {t('watermarkBatch.size')}
          <input
            data-testid="opt-size"
            type="number"
            min={2}
            max={20}
            value={options.fontSize}
            onChange={(e) => handleOptionChange({ fontSize: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('watermarkBatch.color')}
          <input
            data-testid="opt-color"
            type="color"
            value={options.color}
            onChange={(e) => handleOptionChange({ color: e.target.value })}
            className="h-8 w-12 rounded border border-slate-300 dark:border-slate-700"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('watermarkBatch.opacity')}
          <input
            data-testid="opt-opacity"
            type="number"
            min={10}
            max={100}
            value={options.opacity}
            onChange={(e) => handleOptionChange({ opacity: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('watermarkBatch.angle')}
          <input
            data-testid="opt-angle"
            type="number"
            min={-45}
            max={45}
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
          {t('watermarkBatch.tile')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('watermarkBatch.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as WatermarkBatchOptions['format'] })
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
          {t('watermarkBatch.quality')}
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
          {t('watermarkBatch.process')}
        </button>
        {processing && (
          <button
            data-testid="cancel"
            type="button"
            onClick={handleCancel}
            className="rounded border border-red-300 px-4 py-1 text-sm text-red-600 dark:border-red-700 dark:text-red-400"
          >
            {t('watermarkBatch.cancel')}
          </button>
        )}
        {items.length > 0 && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('watermarkBatch.reset')}
          </button>
        )}
      </div>

      {items.length > 0 && (
        <p data-testid="progress" className="text-sm text-slate-600 dark:text-slate-400">
          {t('watermarkBatch.progress')}：{finished} / {items.length}
        </p>
      )}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果列表：缩略图 + 每项状态 + 逐项下载 */}
      {items.length > 0 && (
        <div data-testid="result-list" className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t('watermarkBatch.resultList')}</h3>
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
                    {it.status === 'error' && it.error ? `：${it.error}` : ''}
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
                    {t('watermarkBatch.download')}
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
