import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'
import { assertFileSizeOk, computeDiff, diffRatioText, errorMessage, parseThreshold } from './utils'
import type { PixelData } from './utils'
import type { ImageCompareOptions } from './schema'

interface SlotState {
  file: File
  url: string
}

interface CachedPixels {
  img: HTMLImageElement
  px: PixelData
}

/** 取 2D 上下文；失败时抛错，由调用方 catch 后展示 */
function requireCtx(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  return ctx
}

/** 按原尺寸把图片画到新 canvas（图 A 的像素读取通道） */
function drawFull(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  requireCtx(canvas).drawImage(img, 0, 0, img.width, img.height)
  return canvas
}

/**
 * 读取像素并按 key 缓存。scaled=true 时先把图片等比缩放到目标尺寸
 * （diff 模式下图 B 向图 A 对齐），否则按原尺寸读取。
 */
async function readPixels(
  cache: Map<string, CachedPixels>,
  key: string,
  file: File,
  targetW: number,
  targetH: number,
  scaled: boolean,
): Promise<CachedPixels> {
  const cached = cache.get(key)
  if (cached) return cached
  const img = await loadImageFromBlob(file)
  const w = scaled ? targetW : img.width
  const h = scaled ? targetH : img.height
  const canvas = scaled ? drawScaled(img, img.width, img.height, w, h) : drawFull(img)
  const d = requireCtx(canvas).getImageData(0, 0, w, h)
  const entry: CachedPixels = { img, px: { data: d.data, width: d.width, height: d.height } }
  cache.set(key, entry)
  return entry
}

export default function Tool() {
  const t = useTranslate()
  const [slotA, setSlotA] = useState<SlotState | null>(null)
  const [slotB, setSlotB] = useState<SlotState | null>(null)
  const [errorA, setErrorA] = useState<string | null>(null)
  const [errorB, setErrorB] = useState<string | null>(null)
  const [diff, setDiff] = useState<{ diffPixels: number; totalPixels: number } | null>(null)
  const [diffError, setDiffError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [dragA, setDragA] = useState(false)
  const [dragB, setDragB] = useState(false)
  const [options, setOptions] = useState<ImageCompareOptions>({ mode: 'side', threshold: '30' })
  // 用 key 强制重挂载 file input 来清空已选文件
  const [inputKey, setInputKey] = useState(0)
  const baseRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const pixelCache = useRef(new Map<string, CachedPixels>())

  /** 某槽位接收文件：类型/大小校验失败只影响本槽位，不影响另一张图 */
  const handleSlotFiles = useCallback((which: 'A' | 'B', files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    try {
      assertFileSizeOk(file.size)
      if (!isSupportedImageFile(file)) throw new Error('不支持的图片格式')
      const url = URL.createObjectURL(file)
      if (which === 'A') {
        setSlotA((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { file, url }
        })
        setErrorA(null)
      } else {
        setSlotB((prev) => {
          if (prev) URL.revokeObjectURL(prev.url)
          return { file, url }
        })
        setErrorB(null)
      }
    } catch (err) {
      if (which === 'A') setErrorA(errorMessage(err))
      else setErrorB(errorMessage(err))
    }
  }, [])

  // diff 模式：两张图就绪后计算差异并绘制；阈值/模式变更自动重算，像素走缓存免重复解码。
  // 结果区仅在 ready && mode==='diff' 时渲染：切回 side 模式旧 diff 自动隐藏；
  // 重置按钮会同步清空 diff/diffError，因此 effect 内不做同步 setState（避免级联渲染）。
  useEffect(() => {
    if (options.mode !== 'diff' || !slotA || !slotB) return
    // 走到这里时 diff 结果区已渲染，两个 canvas 必定已挂载
    const baseCanvas = baseRef.current as HTMLCanvasElement
    const overlayCanvas = overlayRef.current as HTMLCanvasElement
    void (async () => {
      setProcessing(true)
      setDiffError(null)
      try {
        const threshold = parseThreshold(options.threshold)
        const cache = pixelCache.current
        const entryA = await readPixels(cache, `a:${slotA.url}`, slotA.file, 0, 0, false)
        const keyB = `b:${slotB.url}|${entryA.px.width}x${entryA.px.height}`
        const entryB = await readPixels(
          cache,
          keyB,
          slotB.file,
          entryA.px.width,
          entryA.px.height,
          true,
        )
        const res = computeDiff(entryA.px, entryB.px, threshold)
        baseCanvas.width = entryA.px.width
        baseCanvas.height = entryA.px.height
        overlayCanvas.width = entryA.px.width
        overlayCanvas.height = entryA.px.height
        // 底层画图 A，差异层（红半透明）叠加其上
        requireCtx(baseCanvas).drawImage(entryA.img, 0, 0, entryA.px.width, entryA.px.height)
        const octx = requireCtx(overlayCanvas)
        const frame = octx.getImageData(0, 0, entryA.px.width, entryA.px.height)
        frame.data.set(res.diffData)
        octx.putImageData(frame, 0, 0)
        setDiff({ diffPixels: res.diffPixels, totalPixels: res.totalPixels })
      } catch (err) {
        setDiffError(errorMessage(err))
        setDiff(null)
      } finally {
        setProcessing(false)
      }
    })()
  }, [options.mode, options.threshold, slotA, slotB, t])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    if (slotA) URL.revokeObjectURL(slotA.url)
    if (slotB) URL.revokeObjectURL(slotB.url)
    pixelCache.current.clear()
    setSlotA(null)
    setSlotB(null)
    setErrorA(null)
    setErrorB(null)
    setDiff(null)
    setDiffError(null)
  }, [slotA, slotB])

  const ready = slotA !== null && slotB !== null

  const renderSlot = (which: 'A' | 'B') => {
    const slot = which === 'A' ? slotA : slotB
    const error = which === 'A' ? errorA : errorB
    const dragging = which === 'A' ? dragA : dragB
    const setDragging = which === 'A' ? setDragA : setDragB
    return (
      <div>
        <p className="mb-1 text-sm font-medium">
          {t(which === 'A' ? 'imageCompare.slotA' : 'imageCompare.slotB')}
        </p>
        {/* 文件投放区：用 label 包裹，原生可点击/键盘聚焦 */}
        <label
          data-testid={which === 'A' ? 'dropzone-a' : 'dropzone-b'}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            handleSlotFiles(which, e.dataTransfer.files)
          }}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            dragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          <input
            key={inputKey}
            data-testid={which === 'A' ? 'file-a' : 'file-b'}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleSlotFiles(which, e.target.files)}
          />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {slot
              ? slot.file.name
              : t(which === 'A' ? 'imageCompare.dropHintA' : 'imageCompare.dropHintB')}
          </p>
        </label>
        {error && (
          <p
            data-testid={which === 'A' ? 'error-a' : 'error-b'}
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('imageCompare.note')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {renderSlot('A')}
        {renderSlot('B')}
      </div>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('imageCompare.mode')}
          <select
            data-testid="opt-mode"
            value={options.mode}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                mode: e.target.value as ImageCompareOptions['mode'],
              }))
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="side">{t('imageCompare.modeSide')}</option>
            <option value="diff">{t('imageCompare.modeDiff')}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('imageCompare.threshold')}
          <input
            data-testid="opt-threshold"
            type="number"
            min={0}
            max={255}
            value={options.threshold}
            onChange={(e) => setOptions((prev) => ({ ...prev, threshold: e.target.value }))}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {(slotA ?? slotB) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('imageCompare.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('imageCompare.processing')}</p>}
      {diffError && (
        <p data-testid="diff-error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {diffError}
        </p>
      )}

      {/* 结果：side 模式并排显示 */}
      {ready && options.mode === 'side' && slotA && slotB && (
        <div data-testid="result-side" className="grid gap-4 sm:grid-cols-2">
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {t('imageCompare.slotA')}
            </figcaption>
            <img src={slotA.url} alt="" className="max-h-96 rounded border object-contain" />
          </figure>
          <figure>
            <figcaption className="mb-1 text-sm text-slate-500">
              {t('imageCompare.slotB')}
            </figcaption>
            <img src={slotB.url} alt="" className="max-h-96 rounded border object-contain" />
          </figure>
        </div>
      )}

      {/* 结果：diff 模式差异热力图（底层图 A + 红色半透明差异层） */}
      {ready && options.mode === 'diff' && (
        <div data-testid="result-diff" className="flex flex-col gap-2">
          <div className="relative w-fit">
            <canvas data-testid="diff-canvas" ref={baseRef} className="max-h-96 rounded border" />
            <canvas
              data-testid="diff-overlay"
              ref={overlayRef}
              className="absolute inset-0 max-h-96 rounded"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('imageCompare.diffNote')}</p>
          {diff && (
            <p data-testid="diff-stats" className="text-sm text-slate-600 dark:text-slate-400">
              {t('imageCompare.diffStatsDiff')} {diff.diffPixels} /{' '}
              {t('imageCompare.diffStatsTotal')} {diff.totalPixels}，
              {t('imageCompare.diffStatsRatio')} {diffRatioText(diff.diffPixels, diff.totalPixels)}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
