import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import { drawScaled, isSupportedImageFile, loadImageFromBlob } from '../../lib/image'
import {
  DOWNSAMPLE_SIZE,
  assertFileSizeOk,
  errorMessage,
  extractPalette,
  parseColorCount,
  withFallback,
} from './utils'
import type { PaletteColor } from './utils'
import type { ColorExtractOptions } from './schema'

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [palette, setPalette] = useState<PaletteColor[]>([])
  const [copiedHex, setCopiedHex] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<ColorExtractOptions>({ count: '6' })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: ColorExtractOptions) => {
      setProcessing(true)
      setError(null)
      setCopiedHex(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) {
          throw new Error(withFallback(t('colorExtract.error.unsupported'), '不支持的图片格式'))
        }
        const count = parseColorCount(opts.count)
        const img = await loadImageFromBlob(file)
        // 下采样到 100×100 后取像素统计，兼顾速度与代表性
        const small = drawScaled(img, img.width, img.height, DOWNSAMPLE_SIZE, DOWNSAMPLE_SIZE)
        const ctx = small.getContext('2d')
        if (!ctx) {
          throw new Error(withFallback(t('colorExtract.error.canvas'), 'Canvas 2D 上下文不可用'))
        }
        const { data } = ctx.getImageData(0, 0, small.width, small.height)
        setPalette(extractPalette(data, count))
        setFileName(file.name)
      } catch (err) {
        setError(errorMessage(err))
        setPalette([])
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
    (patch: Partial<ColorExtractOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理
      const input = fileRef.current
      if (input?.files?.[0]) void processFile(input.files[0], next)
    },
    [options, processFile],
  )

  const handleCopy = useCallback(
    async (hex: string) => {
      try {
        await navigator.clipboard.writeText(hex)
        setCopiedHex(hex)
        setError(null)
      } catch {
        // i18n 键由协调员统一合并；兜底保证缺键时仍有可读提示
        setError(withFallback(t('colorExtract.error.copyFailed'), '复制失败'))
      }
    },
    [t],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setPalette([])
    setCopiedHex(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('colorExtract.note')}</p>

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
          {fileName ? fileName : t('colorExtract.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('colorExtract.count')}
          <input
            data-testid="opt-count"
            type="number"
            min={3}
            max={10}
            value={options.count}
            onChange={(e) => handleOptionChange({ count: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {fileName !== '' && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('colorExtract.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('colorExtract.processing')}</p>}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 调色板结果 */}
      {palette.length > 0 && (
        <div data-testid="palette" className="flex flex-col gap-2">
          <p className="text-sm text-slate-500">{t('colorExtract.paletteTitle')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {palette.map((c) => (
              <button
                key={c.hex}
                data-testid="swatch"
                type="button"
                title={c.hex}
                onClick={() => void handleCopy(c.hex)}
                className="overflow-hidden rounded-lg border border-slate-200 text-left dark:border-slate-700"
              >
                <span className="block h-16 w-full" style={{ backgroundColor: c.hex }} />
                <span className="block px-2 py-1 font-mono text-xs">{c.hex}</span>
                <span className="block px-2 pb-1 text-xs text-slate-500">
                  RGB({c.r}, {c.g}, {c.b}) · {(c.ratio * 100).toFixed(1)}%
                </span>
              </button>
            ))}
          </div>
          {copiedHex && (
            <p data-testid="copied" className="text-sm text-green-600 dark:text-green-400">
              {t('colorExtract.copied')}
              {copiedHex}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
