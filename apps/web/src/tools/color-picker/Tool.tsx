import { useCallback, useState, type FormEvent, type MouseEvent } from 'react'
import { useTranslate } from '../../i18n'
import { createCanvas, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'
import {
  errorMessage,
  formatHslText,
  formatRgbText,
  hexToRgb,
  isAbortError,
  isEyeDropperSupported,
  parseHexInput,
  rgbToHex,
  rgbToHsl,
} from './utils'
import type { ColorPickerOptions } from './schema'

/** Canvas 兜底路径的取色板：预览 URL、自然尺寸、已绘制好的 2D 上下文 */
interface ColorBoard {
  url: string
  width: number
  height: number
  ctx: CanvasRenderingContext2D
}

const VALUE_BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1 font-mono text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800'

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [colorHex, setColorHex] = useState<string | null>(null)
  const [board, setBoard] = useState<ColorBoard | null>(null)
  const [options, setOptions] = useState<ColorPickerOptions>({})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const supported = isEyeDropperSupported()

  // colorHex 为空时用黑色占位推导展示文本，渲染仍由 colorHex !== null 控制
  const rgb = hexToRgb(colorHex ?? '#000000')
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)
  const rgbText = formatRgbText(rgb.r, rgb.g, rgb.b)
  const hslText = formatHslText(hsl.h, hsl.s, hsl.l)

  const applyColor = useCallback((hex: string) => {
    setColorHex(hex)
    setError(null)
    setNotice(null)
  }, [])

  /** 主路径：EyeDropper 系统级取色 */
  const handleEyeDropperPick = useCallback(async () => {
    const Ctor = window.EyeDropper
    if (!Ctor) {
      setError(t('colorPicker.error.unsupported'))
      return
    }
    setPicking(true)
    setError(null)
    setNotice(null)
    try {
      const result = await new Ctor().open()
      applyColor(parseHexInput(result.sRGBHex))
    } catch (err) {
      if (isAbortError(err)) {
        // 用户主动取消：轻提示，不算错误
        setNotice(t('colorPicker.notice.cancelled'))
      } else {
        setError(t('colorPicker.error.pickFailed'))
      }
    } finally {
      setPicking(false)
    }
  }, [applyColor, t])

  /** 兜底路径：上传图片并绘制到内存 Canvas，供点选像素 */
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      setError(null)
      setNotice(null)
      try {
        if (!isSupportedImageFile(file)) throw new Error(t('colorPicker.error.unsupportedFile'))
        const img = await loadImageFromBlob(file)
        const canvas = createCanvas(img.width, img.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error(t('colorPicker.error.canvas'))
        ctx.drawImage(img, 0, 0)
        setBoard({ url: URL.createObjectURL(file), width: img.width, height: img.height, ctx })
      } catch (err) {
        setError(errorMessage(err))
        setBoard(null)
      }
    },
    [t],
  )

  /** 兜底路径：点击图片任意位置，按显示/自然尺寸比例换算后取像素 */
  const handleCanvasClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (!board) return
      // 键盘回车/空格激活按钮时没有点击坐标，无法定位像素，忽略
      if (e.clientX === 0 && e.clientY === 0) return
      const target = e.target as HTMLImageElement
      const rect = target.getBoundingClientRect()
      // 除数为 0 守卫：未布局完成时忽略此次点击
      if (rect.width === 0 || rect.height === 0) return
      const x = Math.floor(((e.clientX - rect.left) / rect.width) * board.width)
      const y = Math.floor(((e.clientY - rect.top) / rect.height) * board.height)
      const px = Math.min(Math.max(x, 0), board.width - 1)
      const py = Math.min(Math.max(y, 0), board.height - 1)
      const data = board.ctx.getImageData(px, py, 1, 1).data
      applyColor(rgbToHex(data[0], data[1], data[2]))
    },
    [applyColor, board],
  )

  /** 手动输入色值 */
  const handleManualApply = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      try {
        applyColor(parseHexInput(options.manualHex ?? ''))
      } catch (err) {
        setError(errorMessage(err))
      }
    },
    [applyColor, options.manualHex],
  )

  /** 点击色值复制到剪贴板，失败降级为错误提示 */
  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setNotice(t('colorPicker.notice.copied'))
      } catch {
        setError(t('colorPicker.error.copyFailed'))
      }
    },
    [t],
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('colorPicker.note')}</p>

      {/* 主路径：浏览器支持 EyeDropper 才展示按钮 */}
      {supported ? (
        <button
          data-testid="eyedropper-btn"
          type="button"
          disabled={picking}
          onClick={() => void handleEyeDropperPick()}
          className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {picking ? t('colorPicker.picking') : t('colorPicker.pickFromScreen')}
        </button>
      ) : (
        <p data-testid="fallback-hint" className="text-sm text-amber-600 dark:text-amber-400">
          {t('colorPicker.fallbackHint')}
        </p>
      )}

      {/* 兜底路径：上传图片后点击取色 */}
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
          void handleFiles(e.dataTransfer.files)
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
            : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <input
          data-testid="file-input"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('colorPicker.dropHint')}</p>
      </label>
      <p className="-mt-2 text-xs text-slate-500 dark:text-slate-500">
        {t('colorPicker.canvasHint')}
      </p>
      {/* 用原生 button 包裹图片，保证键盘可达；点击坐标从事件目标图片读取 */}
      <button
        type="button"
        data-testid="canvas-pick"
        onClick={handleCanvasClick}
        className={
          board
            ? 'max-h-80 cursor-crosshair rounded border border-slate-300 p-0 dark:border-slate-700'
            : 'hidden'
        }
      >
        <img
          data-testid="canvas-img"
          src={board?.url}
          alt={t('colorPicker.canvasImgAlt')}
          className="block max-h-80 object-contain"
        />
      </button>

      {/* 手动输入 */}
      <form
        data-testid="manual-form"
        onSubmit={handleManualApply}
        className="flex flex-wrap items-center gap-2"
      >
        <label className="flex items-center gap-2 text-sm">
          {t('colorPicker.manualLabel')}
          <input
            data-testid="manual-hex"
            value={options.manualHex ?? ''}
            onChange={(e) => setOptions({ ...options, manualHex: e.target.value })}
            placeholder={t('colorPicker.manualPlaceholder')}
            maxLength={20}
            className="w-28 rounded border border-slate-300 px-2 py-1 font-mono dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <button
          data-testid="manual-apply"
          type="submit"
          className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
        >
          {t('colorPicker.apply')}
        </button>
      </form>

      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {notice !== null && (
        <p data-testid="notice" className="text-sm text-green-600 dark:text-green-400">
          {notice}
        </p>
      )}

      {/* 结果：大色块 + HEX / RGB / HSL，点击任意值复制 */}
      {colorHex !== null && (
        <div data-testid="result" className="flex flex-col gap-3">
          <div
            data-testid="swatch"
            className="h-24 w-full rounded border border-slate-300 dark:border-slate-700"
            style={{ backgroundColor: colorHex }}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-14 text-sm text-slate-500">{t('colorPicker.hexLabel')}</span>
              <button
                data-testid="hex"
                type="button"
                onClick={() => void handleCopy(colorHex)}
                title={t('colorPicker.copy')}
                className={VALUE_BTN_CLASS}
              >
                {colorHex}
              </button>
              <button
                data-testid="copy-hex"
                type="button"
                onClick={() => void handleCopy(colorHex)}
                className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t('colorPicker.copy')}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-sm text-slate-500">{t('colorPicker.rgbLabel')}</span>
              <button
                data-testid="rgb"
                type="button"
                onClick={() => void handleCopy(rgbText)}
                title={t('colorPicker.copy')}
                className={VALUE_BTN_CLASS}
              >
                {rgbText}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-14 text-sm text-slate-500">{t('colorPicker.hslLabel')}</span>
              <button
                data-testid="hsl"
                type="button"
                onClick={() => void handleCopy(hslText)}
                title={t('colorPicker.copy')}
                className={VALUE_BTN_CLASS}
              >
                {hslText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
