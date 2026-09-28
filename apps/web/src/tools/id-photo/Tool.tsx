import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import {
  canvasToBlob,
  createCanvas,
  downloadBlob,
  formatBytes,
  isSupportedImageFile,
  loadImageFromBlob,
  readFileAsDataURL,
} from '../../lib/image'
import {
  LAYOUT_GAP_MM,
  SPEC_PRESETS,
  assertFileSizeOk,
  buildOutputFileName,
  computeCropRect,
  computeLayout,
  errorMessage,
  mmToPx,
  paperMmForLayout,
  parseDpi,
  parseScale,
  resolveBgColor,
  resolveSpec,
} from './utils'
import type { IdPhotoOptions, LayoutKey, SpecKey } from './schema'

interface Result {
  url: string
  fileName: string
  width: number
  height: number
  blob: Blob
  previewUrl: string
  layout: LayoutKey
  cols: number
  rows: number
  count: number
}

/** 取 Canvas 2D 上下文，失败抛错（lib 层同风格中文错误） */
function ctx2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  return ctx
}

const DPI_VALUES = ['150', '300', '600']

export default function Tool() {
  const t = useTranslate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<IdPhotoOptions>({
    spec: '1inch',
    customW: '',
    customH: '',
    dpi: '300',
    scale: '100',
    bgColorMode: 'red',
    customBg: '#ffffff',
    layout: 'single',
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)

  const processFile = useCallback(
    async (file: File, opts: IdPhotoOptions) => {
      setProcessing(true)
      setError(null)
      try {
        assertFileSizeOk(file.size)
        if (!isSupportedImageFile(file)) throw new Error(t('idPhoto.error.unsupported'))
        const { wMm, hMm } = resolveSpec(opts.spec, opts.customW, opts.customH)
        const dpi = parseDpi(opts.dpi)
        const wPx = mmToPx(wMm, dpi)
        const hPx = mmToPx(hMm, dpi)
        const scale = parseScale(opts.scale)
        const bg = resolveBgColor(opts.bgColorMode, opts.customBg)
        const img = await loadImageFromBlob(file)
        const crop = computeCropRect(img.width, img.height, wPx / hPx, scale)
        // 先填充底色再绘制人像：原图透明区域即显示底色
        const photo = createCanvas(wPx, hPx)
        const pctx = ctx2d(photo)
        pctx.fillStyle = bg
        pctx.fillRect(0, 0, wPx, hPx)
        pctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, wPx, hPx)

        let finalCanvas = photo
        let cols = 1
        let rows = 1
        const paper = paperMmForLayout(opts.layout)
        if (paper) {
          const paperW = mmToPx(paper.wMm, dpi)
          const paperH = mmToPx(paper.hMm, dpi)
          const gap = mmToPx(LAYOUT_GAP_MM, dpi)
          const placed = computeLayout(paperW, paperH, wPx, hPx, gap)
          if (placed.cols === 0 || placed.rows === 0) {
            throw new Error(t('idPhoto.error.tooBig'))
          }
          cols = placed.cols
          rows = placed.rows
          const sheet = createCanvas(paperW, paperH)
          const sctx = ctx2d(sheet)
          sctx.fillStyle = '#ffffff'
          sctx.fillRect(0, 0, paperW, paperH)
          for (const pos of placed.positions) {
            sctx.drawImage(photo, pos.x, pos.y)
          }
          finalCanvas = sheet
        }

        const blob = await canvasToBlob(finalCanvas, 'image/jpeg', 0.92)
        const url = URL.createObjectURL(blob)
        const preview = await readFileAsDataURL(file)
        setResult({
          url,
          fileName: buildOutputFileName(file.name, opts.spec, opts.layout),
          width: finalCanvas.width,
          height: finalCanvas.height,
          blob,
          previewUrl: preview,
          layout: opts.layout,
          cols,
          rows,
          count: cols * rows,
        })
        setFileName(file.name)
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
      setSelectedFile(file)
      void processFile(file, options)
    },
    [options, processFile],
  )

  const handleOptionChange = useCallback(
    (patch: Partial<IdPhotoOptions>) => {
      const next = { ...options, ...patch }
      setOptions(next)
      // 有文件时选项变更即重新处理（selectedFile 状态判空，无 ref 空守卫分支）
      if (selectedFile) void processFile(selectedFile, next)
    },
    [options, processFile, selectedFile],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setResult(null)
    setSelectedFile(null)
    setFileName('')
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('idPhoto.note')}</p>

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
          {fileName ? fileName : t('idPhoto.dropHint')}
        </p>
      </label>

      {/* 选项 */}
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('idPhoto.spec')}
          <select
            data-testid="opt-spec"
            value={options.spec}
            onChange={(e) => handleOptionChange({ spec: e.target.value as SpecKey })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {SPEC_PRESETS.map((p) => (
              <option key={p.key} value={p.key}>
                {t(`idPhoto.spec.${p.key}`)}
              </option>
            ))}
            <option value="custom">{t('idPhoto.spec.custom')}</option>
          </select>
        </label>
        {options.spec === 'custom' && (
          <>
            <label className="flex items-center gap-2 text-sm">
              {t('idPhoto.customW')}
              <input
                data-testid="opt-customw"
                type="number"
                min={1}
                value={options.customW}
                onChange={(e) => handleOptionChange({ customW: e.target.value })}
                className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('idPhoto.customH')}
              <input
                data-testid="opt-customh"
                type="number"
                min={1}
                value={options.customH}
                onChange={(e) => handleOptionChange({ customH: e.target.value })}
                className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          {t('idPhoto.dpi')}
          <select
            data-testid="opt-dpi"
            value={options.dpi}
            onChange={(e) => handleOptionChange({ dpi: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            {DPI_VALUES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('idPhoto.bg')}
          <select
            data-testid="opt-bg"
            value={options.bgColorMode}
            onChange={(e) =>
              handleOptionChange({
                bgColorMode: e.target.value as IdPhotoOptions['bgColorMode'],
              })
            }
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="red">{t('idPhoto.bg.red')}</option>
            <option value="blue">{t('idPhoto.bg.blue')}</option>
            <option value="white">{t('idPhoto.bg.white')}</option>
            <option value="custom">{t('idPhoto.bg.custom')}</option>
          </select>
        </label>
        {options.bgColorMode === 'custom' && (
          <label className="flex items-center gap-2 text-sm">
            <span>{t('idPhoto.bg.custom')}</span>
            <input
              data-testid="opt-custombg"
              type="color"
              value={options.customBg}
              onChange={(e) => handleOptionChange({ customBg: e.target.value })}
              className="h-8 w-12 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
            />
          </label>
        )}
        <label className="flex items-center gap-2 text-sm">
          {t('idPhoto.scale')}（{options.scale}%）
          <input
            data-testid="opt-scale"
            type="range"
            min={50}
            max={200}
            step={1}
            value={options.scale}
            onChange={(e) => handleOptionChange({ scale: e.target.value })}
            className="w-32"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('idPhoto.layout')}
          <select
            data-testid="opt-layout"
            value={options.layout}
            onChange={(e) => handleOptionChange({ layout: e.target.value as LayoutKey })}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="single">{t('idPhoto.layout.single')}</option>
            <option value="5inch">{t('idPhoto.layout.5inch')}</option>
            <option value="a4">{t('idPhoto.layout.a4')}</option>
          </select>
        </label>
        {result && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('idPhoto.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('idPhoto.processing')}</p>}
      {error && (
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
                {t('idPhoto.original')}
              </figcaption>
              <img
                src={result.previewUrl}
                alt=""
                className="max-h-64 rounded border object-contain"
              />
            </figure>
            <figure>
              <figcaption className="mb-1 text-sm text-slate-500">
                {t('idPhoto.photo')} ({formatBytes(result.blob.size)})
              </figcaption>
              <img src={result.url} alt="" className="max-h-64 rounded border object-contain" />
            </figure>
          </div>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('idPhoto.statsSize')}: {result.width} × {result.height} px
            {result.layout !== 'single' && (
              <>
                {' '}
                · {t('idPhoto.statsCount')}: {result.count}（{result.cols}×{result.rows}）
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
            {t('idPhoto.download')}
          </button>
        </div>
      )}
    </div>
  )
}
