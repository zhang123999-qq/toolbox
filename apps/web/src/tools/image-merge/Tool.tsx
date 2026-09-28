import { useCallback, useEffect, useRef, useState } from 'react'
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
  assertEnoughImages,
  assertFileSizeOk,
  buildOutputFileName,
  computeMergeLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseBgColor,
  parseColumns,
  parseGap,
  parseQuality,
} from './utils'
import type { ImageMergeOptions } from './schema'

interface ImageItem {
  id: number
  file: File
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
}

const DIRECTIONS = ['horizontal', 'vertical', 'grid'] as const
const FORMATS = ['jpeg', 'png', 'webp'] as const

/** 方向选项的 i18n key 映射（避免模板字符串 key 绕过 MessageKey 类型检查） */
const DIRECTION_LABEL_KEYS = {
  horizontal: 'imageMerge.direction.horizontal',
  vertical: 'imageMerge.direction.vertical',
  grid: 'imageMerge.direction.grid',
} as const

const DEFAULT_OPTIONS: ImageMergeOptions = {
  direction: 'horizontal',
  columns: '3',
  gap: '0',
  bgColor: '#ffffff',
  align: 'center',
  format: 'jpeg',
  quality: '85',
}

export default function Tool() {
  const t = useTranslate()
  const [images, setImages] = useState<ImageItem[]>([])
  const [result, setResult] = useState<MergeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [options, setOptions] = useState<ImageMergeOptions>(DEFAULT_OPTIONS)
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  // ref 与 state 同步维护，避免回调闭包拿到过期值
  const imagesRef = useRef<ImageItem[]>([])
  const optionsRef = useRef<ImageMergeOptions>(DEFAULT_OPTIONS)
  const idRef = useRef(0)
  // 全部已创建的缩略图 URL：删除/清空/卸载时统一释放
  const urlsRef = useRef<Set<string>>(new Set())
  const resultUrlRef = useRef<string | null>(null)

  const setImagesBoth = (next: ImageItem[]) => {
    imagesRef.current = next
    setImages(next)
  }

  /** 拼接：成功时不碰 error（调用方负责错误文案），失败时写入错误并清空结果 */
  const mergeImages = useCallback(async (list: ImageItem[], opts: ImageMergeOptions) => {
    setProcessing(true)
    try {
      assertEnoughImages(list.length)
      const layout = computeMergeLayout(
        list.map((it) => ({ w: it.width, h: it.height })),
        {
          direction: opts.direction,
          columns: parseColumns(opts.columns),
          gap: parseGap(opts.gap),
          align: opts.align,
        },
      )
      const bg = parseBgColor(opts.bgColor)
      const quality = parseQuality(opts.quality)
      const canvas = createCanvas(layout.width, layout.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2D 上下文不可用')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, layout.width, layout.height)
      for (let i = 0; i < list.length; i++) {
        const img = await loadImageFromBlob(list[i].file)
        const p = layout.placements[i]
        ctx.drawImage(img, p.x, p.y, img.width, img.height)
      }
      const mime = formatToMime(opts.format)
      const blob = await canvasToBlob(canvas, mime, effectiveQuality(opts.format, quality))
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
      const url = URL.createObjectURL(blob)
      resultUrlRef.current = url
      setResult({
        url,
        blob,
        fileName: buildOutputFileName(new Date(), opts.format),
        width: layout.width,
        height: layout.height,
      })
    } catch (err) {
      setError(errorMessage(err))
      setResult(null)
    } finally {
      setProcessing(false)
    }
  }, [])

  /** 卸载时释放残留 URL */
  useEffect(
    () => () => {
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    },
    [],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      void (async () => {
        const errors: string[] = []
        const added: ImageItem[] = []
        // 逐张独立校验：某张失败只记录该张，不污染其他已选图
        for (const file of Array.from(files)) {
          try {
            assertFileSizeOk(file.size)
            if (!isSupportedImageFile(file)) throw new Error(`不支持的图片格式：${file.name}`)
            const img = await loadImageFromBlob(file)
            const url = URL.createObjectURL(file)
            urlsRef.current.add(url)
            added.push({ id: idRef.current++, file, url, width: img.width, height: img.height })
          } catch (err) {
            errors.push(`${errorMessage(err)}`)
          }
        }
        if (added.length > 0) setImagesBoth([...imagesRef.current, ...added])
        setError(errors.length > 0 ? errors.join('；') : null)
        // 有单张错误但图不够时保留文件级错误，不再用"数量不足"覆盖
        if (errors.length === 0 || imagesRef.current.length >= 2) {
          await mergeImages(imagesRef.current, optionsRef.current)
        }
      })()
    },
    [mergeImages],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<ImageMergeOptions>) => {
      const next = { ...optionsRef.current, ...patch }
      optionsRef.current = next
      setOptions(next)
      // 有图时选项变更即重新拼接：先清掉上次的错误，避免陈旧报错残留
      if (imagesRef.current.length >= 2) {
        setError(null)
        void mergeImages(imagesRef.current, next)
      }
    },
    [mergeImages],
  )

  const removeImage = useCallback(
    (id: number) => {
      const next: ImageItem[] = []
      for (const it of imagesRef.current) {
        if (it.id === id) {
          URL.revokeObjectURL(it.url)
          urlsRef.current.delete(it.url)
        } else {
          next.push(it)
        }
      }
      setImagesBoth(next)
      if (next.length >= 2) {
        void mergeImages(next, optionsRef.current)
      } else {
        if (resultUrlRef.current) {
          URL.revokeObjectURL(resultUrlRef.current)
          resultUrlRef.current = null
        }
        setResult(null)
        setError('至少需要 2 张图片才能拼接')
      }
    },
    [mergeImages],
  )

  const clearAll = useCallback(() => {
    for (const url of urlsRef.current) URL.revokeObjectURL(url)
    urlsRef.current.clear()
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current)
      resultUrlRef.current = null
    }
    setImagesBoth([])
    setResult(null)
    setError(null)
    setInputKey((k) => k + 1)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageMerge.note')}</p>

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
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageMerge.dropHint')}</p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageMerge.direction')}
          <select
            data-testid="opt-direction"
            value={options.direction}
            onChange={(e) =>
              handleOptionChange({ direction: e.target.value as ImageMergeOptions['direction'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {t(DIRECTION_LABEL_KEYS[d])}
              </option>
            ))}
          </select>
        </label>
        {options.direction === 'grid' && (
          <label className="flex items-center gap-2 text-sm">
            {t('imageMerge.columns')}
            <input
              data-testid="opt-columns"
              type="number"
              min={1}
              max={10}
              value={options.columns}
              onChange={(e) => handleOptionChange({ columns: e.target.value })}
              className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          {t('imageMerge.gap')}
          <input
            data-testid="opt-gap"
            type="number"
            min={0}
            max={200}
            value={options.gap}
            onChange={(e) => handleOptionChange({ gap: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageMerge.bgColor')}
          <input
            data-testid="opt-bgcolor"
            type="color"
            value={options.bgColor}
            onChange={(e) => handleOptionChange({ bgColor: e.target.value })}
            className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
          />
        </label>
        {options.direction !== 'grid' && (
          <label className="flex items-center gap-2 text-sm">
            {t('imageMerge.align')}
            <select
              data-testid="opt-align"
              value={options.align}
              onChange={(e) =>
                handleOptionChange({ align: e.target.value as ImageMergeOptions['align'] })
              }
              className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            >
              {options.direction === 'horizontal' ? (
                <>
                  <option value="top">{t('imageMerge.align.top')}</option>
                  <option value="center">{t('imageMerge.align.center')}</option>
                  <option value="bottom">{t('imageMerge.align.bottom')}</option>
                </>
              ) : (
                <>
                  <option value="left">{t('imageMerge.align.left')}</option>
                  <option value="center">{t('imageMerge.align.center')}</option>
                  <option value="right">{t('imageMerge.align.right')}</option>
                </>
              )}
            </select>
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          {t('imageMerge.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as ImageMergeOptions['format'] })
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
          {t('imageMerge.quality')}
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
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('imageMerge.qualityNote')}</p>

      {processing && <p data-testid="processing">{t('imageMerge.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 已选图片 */}
      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {t('imageMerge.images')}（{images.length}）
            </p>
            <button
              data-testid="clear"
              type="button"
              onClick={clearAll}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('imageMerge.clear')}
            </button>
          </div>
          <div data-testid="thumb-list" className="flex flex-wrap gap-3">
            {images.map((it) => (
              <div key={it.id} className="flex flex-col items-center gap-1">
                <img
                  src={it.url}
                  alt=""
                  className="h-20 w-20 rounded border object-cover dark:border-slate-700"
                />
                <p className="max-w-24 truncate text-xs text-slate-500" title={it.file.name}>
                  {it.file.name} ({it.width}×{it.height})
                </p>
                <button
                  data-testid={`remove-${it.id}`}
                  type="button"
                  onClick={() => removeImage(it.id)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs dark:border-slate-700"
                >
                  {t('imageMerge.remove')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('imageMerge.statsLabel')}
            {result.width}×{result.height}（{formatBytes(result.blob.size)}）
          </p>
          <img
            src={result.url}
            alt=""
            className="max-h-96 rounded border object-contain dark:border-slate-700"
          />
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('imageMerge.download')}
          </button>
        </div>
      )}
    </div>
  )
}
