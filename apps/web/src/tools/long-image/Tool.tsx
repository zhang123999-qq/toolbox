import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  drawScaled,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
} from '../../lib/image'
import {
  assertFileSizeOk,
  buildOutputFileName,
  computeLongLayout,
  effectiveQuality,
  errorMessage,
  formatToMime,
  moveItem,
  parseBgColor,
  parseGap,
  parseQuality,
} from './utils'
import type { LongImageOptions } from './schema'

interface UploadItem {
  id: number
  file: File
  name: string
  size: number
  thumbUrl: string
  width: number
  height: number
}

interface StitchResult {
  url: string
  fileName: string
  width: number
  height: number
  count: number
  blob: Blob
}

let nextItemId = 1

const FORMATS = ['jpeg', 'png', 'webp'] as const
const WIDTH_MODES: LongImageOptions['widthMode'][] = ['uniform', 'original']
const ALIGNS: LongImageOptions['align'][] = ['left', 'center', 'right']

export default function Tool() {
  const t = useTranslate()
  const [items, setItems] = useState<UploadItem[]>([])
  const [options, setOptions] = useState<LongImageOptions>({
    widthMode: 'uniform',
    align: 'center',
    gap: '0',
    bgColor: '#ffffff',
    format: 'jpeg',
    quality: '85',
  })
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<StitchResult | null>(null)
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)

  const stitch = useCallback(
    async (opts: LongImageOptions, list: UploadItem[]) => {
      setProcessing(true)
      setError(null)
      try {
        const gap = parseGap(opts.gap)
        const bgColor = parseBgColor(opts.bgColor)
        const quality = parseQuality(opts.quality)
        const layout = computeLongLayout(
          list.map((it) => ({ w: it.width, h: it.height })),
          { widthMode: opts.widthMode, gap, align: opts.align },
        )
        const canvas = createCanvas(layout.width, layout.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('longImage.error.noContext'))
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < list.length; i += 1) {
          const item = list[i]
          const img = await loadImageFromBlob(item.file)
          const p = layout.placements[i]
          if (opts.widthMode === 'uniform') {
            // uniform 模式：高质量缩放到统一宽度后再贴到主画布
            const scaled = drawScaled(img, img.width, img.height, p.w, p.h)
            ctx.drawImage(scaled, p.x, p.y)
          } else {
            ctx.drawImage(img, p.x, p.y, p.w, p.h)
          }
        }
        const blob = await canvasToBlob(
          canvas,
          formatToMime(opts.format),
          effectiveQuality(opts.format, quality),
        )
        setResult((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return {
            url: URL.createObjectURL(blob),
            fileName: buildOutputFileName(opts.format, new Date()),
            width: layout.width,
            height: layout.height,
            count: list.length,
            blob,
          }
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

  // itemsRef / optionsRef 与 state 同步镜像：异步上传收尾时需要同步拿到
  // 最新列表做拼接；所有变更都走 commitItems / handleOptionChange，保证不分叉
  const itemsRef = useRef<UploadItem[]>([])
  const optionsRef = useRef(options)

  // 按当前列表与选项触发拼接；不足 2 张时清掉旧结果。
  // 注意：不清 error，避免覆盖 handleFiles 刚写入的单张文件错误。
  const runStitch = useCallback(
    (opts: LongImageOptions, list: UploadItem[]) => {
      if (list.length >= 2) {
        void stitch(opts, list)
      } else {
        setResult((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return null
        })
      }
    },
    [stitch],
  )

  const commitItems = useCallback(
    (next: UploadItem[]) => {
      itemsRef.current = next
      setItems(next)
      runStitch(optionsRef.current, next)
    },
    [runStitch],
  )

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      const added: UploadItem[] = []
      const errs: string[] = []
      for (const file of Array.from(files)) {
        try {
          if (!isSupportedImageFile(file)) throw new Error(t('longImage.error.unsupported'))
          assertFileSizeOk(file.size)
          const img = await loadImageFromBlob(file)
          added.push({
            id: nextItemId++,
            file,
            name: file.name,
            size: file.size,
            thumbUrl: URL.createObjectURL(file),
            width: img.width,
            height: img.height,
          })
        } catch (err) {
          // 单张失败只记错误，不污染其他图片
          errs.push(`${file.name}：${errorMessage(err)}`)
        }
      }
      // 收尾是同步的（无 await 间隔），与并发的上传收尾互不覆盖
      if (added.length > 0) commitItems([...itemsRef.current, ...added])
      if (errs.length > 0) setError(errs.join('\n'))
      else setError(null)
    },
    [commitItems, t],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<LongImageOptions>) => {
      const next = { ...optionsRef.current, ...patch }
      optionsRef.current = next
      setOptions(next)
      runStitch(next, itemsRef.current)
    },
    [runStitch],
  )

  const move = useCallback(
    (index: number, dir: -1 | 1) => {
      commitItems(moveItem(itemsRef.current, index, dir))
    },
    [commitItems],
  )

  const removeItem = useCallback(
    (index: number) => {
      const target = itemsRef.current[index]
      URL.revokeObjectURL(target.thumbUrl)
      commitItems(itemsRef.current.filter((_, i) => i !== index))
    },
    [commitItems],
  )

  const handleClear = useCallback(() => {
    itemsRef.current.forEach((it) => URL.revokeObjectURL(it.thumbUrl))
    itemsRef.current = []
    setItems([])
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
    setError(null)
    setInputKey((k) => k + 1)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('longImage.note')}</p>

      {/* 文件投放区：用 label 包裹，原生可点击/键盘聚焦，无需额外 a11y 分支 */}
      <label
        data-testid="dropzone"
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('border-blue-500')
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('border-blue-500')
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('border-blue-500')
          void handleFiles(e.dataTransfer.files)
        }}
        className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-8 text-center transition-colors dark:border-slate-700"
      >
        <input
          key={inputKey}
          data-testid="file-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('longImage.dropHint')}</p>
      </label>

      {items.length > 0 && (
        <p data-testid="count" className="text-sm text-slate-600 dark:text-slate-400">
          {t('longImage.selected')}：{items.length}
          {t('longImage.atLeastTwo')}
        </p>
      )}

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('longImage.widthMode')}
          <select
            data-testid="opt-widthMode"
            value={options.widthMode}
            onChange={(e) =>
              handleOptionChange({ widthMode: e.target.value as LongImageOptions['widthMode'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {WIDTH_MODES.map((m) => (
              <option key={m} value={m}>
                {t(`longImage.widthMode.${m}` as const)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('longImage.align')}
          <select
            data-testid="opt-align"
            value={options.align}
            disabled={options.widthMode !== 'original'}
            onChange={(e) =>
              handleOptionChange({ align: e.target.value as LongImageOptions['align'] })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {ALIGNS.map((a) => (
              <option key={a} value={a}>
                {t(`longImage.align.${a}` as const)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('longImage.gap')}
          <input
            data-testid="opt-gap"
            type="number"
            min={0}
            max={200}
            value={options.gap}
            onChange={(e) => handleOptionChange({ gap: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
          {t('longImage.px')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('longImage.bgColor')}
          <input
            data-testid="opt-bgColor"
            type="color"
            value={options.bgColor}
            onChange={(e) => handleOptionChange({ bgColor: e.target.value })}
            className="h-8 w-12 rounded border border-slate-300 dark:border-slate-700"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('longImage.format')}
          <select
            data-testid="opt-format"
            value={options.format}
            onChange={(e) =>
              handleOptionChange({ format: e.target.value as LongImageOptions['format'] })
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
          {t('longImage.quality')}
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
        {items.length > 0 && (
          <button
            data-testid="clear"
            type="button"
            onClick={handleClear}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('longImage.clear')}
          </button>
        )}
      </div>

      {/* 缩略图列表：上移/下移排序、删除单张 */}
      {items.length > 0 && (
        <ul data-testid="items" className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              data-testid={`item-${index}`}
              className="flex items-center gap-3 rounded border border-slate-200 p-2 dark:border-slate-700"
            >
              <img src={item.thumbUrl} alt="" className="h-14 w-14 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.name}</p>
                <p className="text-xs text-slate-500">
                  {item.width}×{item.height} · {formatBytes(item.size)}
                </p>
              </div>
              <button
                data-testid={`move-up-${index}`}
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-700"
              >
                {t('longImage.moveUp')}
              </button>
              <button
                data-testid={`move-down-${index}`}
                type="button"
                disabled={index === items.length - 1}
                onClick={() => move(index, 1)}
                className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-700"
              >
                {t('longImage.moveDown')}
              </button>
              <button
                data-testid={`remove-${index}`}
                type="button"
                onClick={() => removeItem(index)}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-red-600 dark:border-slate-700"
              >
                {t('longImage.remove')}
              </button>
            </li>
          ))}
        </ul>
      )}

      {processing && <p data-testid="processing">{t('longImage.processing')}</p>}
      {error && (
        <p
          data-testid="error"
          role="alert"
          className="whitespace-pre-line text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <img src={result.url} alt="" className="max-h-96 rounded border object-contain" />
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('longImage.sizeLabel')}：{result.width}×{result.height}，{t('longImage.imagesLabel')}
            ：{result.count}
          </p>
          <button
            data-testid="download"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('longImage.download')}
          </button>
        </div>
      )}
    </div>
  )
}
