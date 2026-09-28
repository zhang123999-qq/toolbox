import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { Translate } from '../../i18n'
import {
  canvasToBlob,
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  CONCURRENCY,
  assertBatchSizeOk,
  assertFileSizeOk,
  buildOutputFileName,
  compressionRatioText,
  computeOutputDimensions,
  createQueue,
  doneCount,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseMaxDimension,
  parseQuality,
  progressPercent,
} from './utils'
import type { BatchItemStatus } from './utils'
import type { ImageBatchOptions } from './schema'

interface BatchResult {
  url: string
  fileName: string
  width: number
  height: number
  origSize: number
  newSize: number
  blob: Blob
}

/** 队列项：可辨识联合，status 收窄后可直接取 result / error，无需空守卫分支 */
type BatchItem =
  | { id: number; file: File; status: 'pending' }
  | { id: number; file: File; status: 'processing' }
  | { id: number; file: File; status: 'success'; result: BatchResult }
  | { id: number; file: File; status: 'error'; error: string }

const FORMAT_OPTIONS = ['jpeg', 'png', 'webp'] as const

/** 状态文案：switch 穷尽四种状态 */
function statusText(t: Translate, status: BatchItemStatus): string {
  switch (status) {
    case 'pending':
      return t('imageBatch.status.pending')
    case 'processing':
      return t('imageBatch.status.processing')
    case 'success':
      return t('imageBatch.status.success')
    case 'error':
      return t('imageBatch.status.error')
  }
}

export default function Tool() {
  const t = useTranslate()
  // 取消标志用 ref：worker 循环内同步读取，避免闭包拿到旧值
  const cancelRef = useRef(false)
  // 处理中标志用 ref：选择文件时同步判断，避免 state 异步导致竞态
  const processingRef = useRef(false)
  const filesRef = useRef<File[]>([])
  const createdUrls = useRef<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [items, setItems] = useState<BatchItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<ImageBatchOptions>({
    format: 'jpeg',
    quality: '80',
    maxDimension: '',
  })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  /** 释放已创建的全部对象 URL（重选 / 重跑 / 重置丢弃旧结果时调用，避免泄漏） */
  const revokeCreatedUrls = useCallback(() => {
    for (const url of createdUrls.current) URL.revokeObjectURL(url)
    createdUrls.current = []
  }, [])

  /** 处理单项：成功/失败都只更新该项状态，不中断队列 */
  const processOne = useCallback(
    async (
      file: File,
      id: number,
      format: ImageBatchOptions['format'],
      quality: number,
      maxDim: number,
    ) => {
      setItems((prev) =>
        prev.map((it): BatchItem =>
          it.id === id ? { id: it.id, file: it.file, status: 'processing' } : it,
        ),
      )
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('imageBatch.error.unsupported'))
        const img = await loadImageFromBlob(file)
        const { width, height } = computeOutputDimensions(img.width, img.height, maxDim)
        const canvas = drawScaled(img, img.width, img.height, width, height)
        const blob = await canvasToBlob(
          canvas,
          formatToMime(format),
          effectiveQuality(format, quality),
        )
        const url = URL.createObjectURL(blob)
        createdUrls.current.push(url)
        const result: BatchResult = {
          url,
          fileName: buildOutputFileName(file.name, format),
          width,
          height,
          origSize: file.size,
          newSize: blob.size,
          blob,
        }
        setItems((prev) =>
          prev.map((it): BatchItem =>
            it.id === id ? { id: it.id, file: it.file, status: 'success', result } : it,
          ),
        )
      } catch (err) {
        const message = errorMessage(err)
        setItems((prev) =>
          prev.map((it): BatchItem =>
            it.id === id ? { id: it.id, file: it.file, status: 'error', error: message } : it,
          ),
        )
      }
    },
    [t],
  )

  /** 开始批量处理：多 worker 从共享游标取项，并发上限 CONCURRENCY */
  const runBatch = useCallback(async () => {
    const files = filesRef.current
    let quality: number
    let maxDim: number
    try {
      quality = parseQuality(options.quality)
      maxDim = parseMaxDimension(options.maxDimension)
    } catch (err) {
      setError(errorMessage(err))
      return
    }
    setError(null)
    revokeCreatedUrls()
    cancelRef.current = false
    processingRef.current = true
    setProcessing(true)
    // 全部重置为等待；旧结果的对象 URL 已在上方释放
    setItems((prev): BatchItem[] =>
      prev.map((it) => ({ id: it.id, file: it.file, status: 'pending' })),
    )
    let cursor = 0
    const total = files.length
    const worker = async (): Promise<void> => {
      for (;;) {
        if (cancelRef.current) return
        const idx = cursor
        cursor += 1
        if (idx >= total) return
        await processOne(files[idx], idx, options.format, quality, maxDim)
      }
    }
    const workers: Array<Promise<void>> = []
    const concurrency = Math.min(CONCURRENCY, total)
    for (let i = 0; i < concurrency; i += 1) workers.push(worker())
    await Promise.all(workers)
    processingRef.current = false
    setProcessing(false)
  }, [options, processOne, revokeCreatedUrls])

  const handleFiles = useCallback(
    (files: FileList | null) => {
      // 处理中忽略新的选择，避免与正在跑的 worker 互相覆盖
      if (processingRef.current) return
      const picked = files ? Array.from(files) : []
      if (picked.length === 0) return
      try {
        assertBatchSizeOk(picked.length)
      } catch (err) {
        setError(errorMessage(err))
        return
      }
      setError(null)
      revokeCreatedUrls()
      filesRef.current = picked
      setItems(
        createQueue(picked.length).map((q, i): BatchItem => ({
          id: q.id,
          file: picked[i],
          status: 'pending',
        })),
      )
      // 重挂载 input，允许重复选择同一批文件
      setInputKey((k) => k + 1)
    },
    [revokeCreatedUrls],
  )

  const handleCancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  const handleReset = useCallback(() => {
    revokeCreatedUrls()
    filesRef.current = []
    setItems([])
    setError(null)
    setInputKey((k) => k + 1)
  }, [revokeCreatedUrls])

  const total = items.length
  const done = doneCount(items)
  const percent = progressPercent(done, total)

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageBatch.note')}</p>

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
          handleFiles(e.dataTransfer?.files ?? null)
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
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageBatch.dropHint')}</p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageBatch.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              setOptions({ ...options, format: e.target.value as ImageBatchOptions['format'] })
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
          {t('imageBatch.quality')}
          <input
            data-testid="opt-quality"
            type="number"
            min={1}
            max={100}
            value={options.quality}
            onChange={(e) => setOptions({ ...options, quality: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageBatch.maxDimension')}
          <input
            data-testid="opt-maxdim"
            type="number"
            min={0}
            placeholder={t('imageBatch.unlimited')}
            value={options.maxDimension}
            onChange={(e) => setOptions({ ...options, maxDimension: e.target.value })}
            className="w-24 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {items.length > 0 && !processing && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageBatch.reset')}
          </button>
        )}
      </div>

      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 总进度：第 n / 共 N 项 + 进度条（动态数字用 JSX 插值，不走 t 传参） */}
      {items.length > 0 && (
        <div data-testid="progress" className="flex flex-col gap-1">
          <div className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
            <div
              className="h-2 rounded bg-blue-600 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageBatch.progress')} {done} / {total}
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      {items.length > 0 && !processing && (
        <button
          data-testid="process"
          type="button"
          onClick={() => void runBatch()}
          className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {t('imageBatch.process')}
        </button>
      )}
      {processing && (
        <button
          data-testid="cancel"
          type="button"
          onClick={handleCancel}
          className="w-fit rounded border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
        >
          {t('imageBatch.cancel')}
        </button>
      )}

      {/* 结果列表：每项状态 + 缩略图 + 原体积→新体积 + 压缩率 + 逐项下载 */}
      {items.length > 0 && (
        <ul data-testid="result-list" className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              data-testid={`item-${index}`}
              className="flex items-center gap-3 rounded border border-slate-200 p-2 dark:border-slate-700"
            >
              <span className="min-w-0 flex-1 truncate text-sm">{item.file.name}</span>
              <span data-testid={`status-${index}`} className="shrink-0 text-sm text-slate-500">
                {statusText(t, item.status)}
              </span>
              {item.status === 'success' && (
                <>
                  <img
                    src={item.result.url}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                  <span className="shrink-0 text-sm text-slate-600 dark:text-slate-400">
                    {formatBytes(item.result.origSize)} → {formatBytes(item.result.newSize)}
                  </span>
                  <span className="shrink-0 text-sm text-slate-500">
                    {compressionRatioText(item.result.origSize, item.result.newSize)}
                  </span>
                  <button
                    data-testid={`download-${index}`}
                    type="button"
                    // success 分支已收窄出 result，无需空守卫
                    onClick={() => downloadBlob(item.result.blob, item.result.fileName)}
                    className="shrink-0 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    {t('imageBatch.download')}
                  </button>
                </>
              )}
              {item.status === 'error' && (
                <span
                  data-testid={`reason-${index}`}
                  role="alert"
                  className="shrink-0 text-sm text-red-600 dark:text-red-400"
                >
                  {item.error}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
