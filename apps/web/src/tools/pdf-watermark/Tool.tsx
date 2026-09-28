import { useCallback, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_OPACITY,
  DEFAULT_ROTATE,
  DEFAULT_SCALE,
  POSITION_IDS,
  applyImageWatermark,
  applyTextWatermark,
  assertFileSizeOk,
  buildOutputFileName,
  detectImageKind,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  parseFontSize,
  parseOpacity,
  parseRotate,
  parseScale,
  tryGetPageCount,
} from './utils'
import type { PdfWatermarkOptions, WatermarkPosition } from './schema'

interface Result {
  url: string
  blob: Blob
  fileName: string
}

/** 九宫格位置 id → 展示文案 key（静态映射，保证 key 受类型检查） */
const POSITION_LABEL_KEYS: Record<WatermarkPosition, MessageKey> = {
  'top-left': 'pdfWatermark.pos.topLeft',
  top: 'pdfWatermark.pos.top',
  'top-right': 'pdfWatermark.pos.topRight',
  left: 'pdfWatermark.pos.left',
  center: 'pdfWatermark.pos.center',
  right: 'pdfWatermark.pos.right',
  'bottom-left': 'pdfWatermark.pos.bottomLeft',
  bottom: 'pdfWatermark.pos.bottom',
  'bottom-right': 'pdfWatermark.pos.bottomRight',
}

/** 颜色预设：value 受 select 约束，展示文案走静态 key 映射 */
const COLOR_PRESETS: Array<{ value: string; labelKey: MessageKey }> = [
  { value: '#000000', labelKey: 'pdfWatermark.color.black' },
  { value: '#808080', labelKey: 'pdfWatermark.color.gray' },
  { value: '#ff0000', labelKey: 'pdfWatermark.color.red' },
  { value: '#0000ff', labelKey: 'pdfWatermark.color.blue' },
  { value: '#008000', labelKey: 'pdfWatermark.color.green' },
]

const ROTATE_PRESETS = [-90, 0, 45] as const

export default function Tool() {
  const t = useTranslate()
  const [dragOver, setDragOver] = useState(false)
  const [imageDragOver, setImageDragOver] = useState(false)
  const [pdfName, setPdfName] = useState('')
  const [pdfBytes, setPdfBytes] = useState<Uint8Array>(new Uint8Array(0))
  const [pdfPages, setPdfPages] = useState<number | null>(null)
  const [wmImageName, setWmImageName] = useState('')
  const [wmImageBytes, setWmImageBytes] = useState<Uint8Array | null>(null)
  const [wmImageKind, setWmImageKind] = useState<'png' | 'jpg'>('png')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [options, setOptions] = useState<PdfWatermarkOptions>({
    watermarkType: 'text',
    text: 'CONFIDENTIAL',
    fontSize: String(DEFAULT_FONT_SIZE),
    color: '#808080',
    opacity: String(DEFAULT_OPACITY),
    rotate: String(DEFAULT_ROTATE),
    position: 'center',
    pageMode: 'all',
    pageRange: '',
    scale: String(DEFAULT_SCALE),
  })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)
  const [imageInputKey, setImageInputKey] = useState(0)

  const handlePdfFiles = useCallback(
    async (incoming: FileList | null) => {
      const file = incoming?.[0]
      if (!file) return
      setError(null)
      setResult(null)
      try {
        assertFileSizeOk(file.size)
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(bytes)) throw new Error(t('pdfWatermark.error.unsupported'))
        setPdfBytes(bytes)
        setPdfName(file.name)
        setPdfPages(await tryGetPageCount(bytes))
      } catch (err) {
        setError(errorMessage(err))
      }
    },
    [t],
  )

  const handleImageFiles = useCallback(async (incoming: FileList | null) => {
    const file = incoming?.[0]
    if (!file) return
    setError(null)
    try {
      assertFileSizeOk(file.size)
      const bytes = new Uint8Array(await file.arrayBuffer())
      const kind = detectImageKind(bytes)
      setWmImageBytes(bytes)
      setWmImageKind(kind)
      setWmImageName(file.name)
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  const setOpt = useCallback((patch: Partial<PdfWatermarkOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  const apply = useCallback(async () => {
    // 按钮在未上传 PDF 时禁用；pdfBytes 恒为已通过魔数校验的 PDF 字节，无需空守卫
    setProcessing(true)
    setError(null)
    setResult(null)
    try {
      const opacity = parseOpacity(options.opacity) / 100
      const position = options.position
      const pageMode = options.pageMode
      const pageRange = options.pageRange
      let out: Uint8Array
      if (options.watermarkType === 'text') {
        out = await applyTextWatermark(pdfBytes, {
          text: options.text,
          fontSize: parseFontSize(options.fontSize),
          colorHex: options.color,
          opacity,
          rotate: parseRotate(options.rotate),
          position,
          pageMode,
          pageRange,
        })
      } else {
        if (!wmImageBytes) throw new Error(t('pdfWatermark.error.noImage'))
        out = await applyImageWatermark(pdfBytes, {
          imageBytes: wmImageBytes,
          imageKind: wmImageKind,
          scale: parseScale(options.scale),
          opacity,
          position,
          pageMode,
          pageRange,
        })
      }
      const blob = new Blob([out.buffer as ArrayBuffer], { type: 'application/pdf' })
      setResult({
        url: URL.createObjectURL(blob),
        blob,
        fileName: buildOutputFileName(pdfName),
      })
    } catch (err) {
      if (isEncryptedPdfError(err)) setError(t('pdfWatermark.error.encrypted'))
      else setError(errorMessage(err))
    } finally {
      setProcessing(false)
    }
  }, [options, pdfBytes, pdfName, t, wmImageBytes, wmImageKind])

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setImageInputKey((k) => k + 1)
    setPdfName('')
    setPdfBytes(new Uint8Array(0))
    setPdfPages(null)
    setWmImageName('')
    setWmImageBytes(null)
    setWmImageKind('png')
    setResult(null)
    setError(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfWatermark.note')}</p>

      {/* PDF 投放区：用 label 包裹，原生可点击/键盘聚焦，无需额外 a11y 分支 */}
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
          void handlePdfFiles(e.dataTransfer.files)
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
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            void handlePdfFiles(e.target.files)
          }}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {pdfName ? pdfName : t('pdfWatermark.dropHint')}
        </p>
      </label>

      {/* 已选 PDF 信息：页数未知（加密/损坏）时只显示文件名 */}
      {pdfName && (
        <p data-testid="pdf-info" className="text-sm text-slate-600 dark:text-slate-400">
          {pdfName}
          {pdfPages !== null && (
            <span>
              （{pdfPages}
              {t('pdfWatermark.pageUnit')}）
            </span>
          )}
        </p>
      )}

      {/* 水印类型 */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm">{t('pdfWatermark.type')}</span>
        <label className="flex items-center gap-1 text-sm">
          <input
            data-testid="opt-type-text"
            type="radio"
            name="watermark-type"
            checked={options.watermarkType === 'text'}
            onChange={() => setOpt({ watermarkType: 'text' })}
          />
          {t('pdfWatermark.typeText')}
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            data-testid="opt-type-image"
            type="radio"
            name="watermark-type"
            checked={options.watermarkType === 'image'}
            onChange={() => setOpt({ watermarkType: 'image' })}
          />
          {t('pdfWatermark.typeImage')}
        </label>
      </div>

      {options.watermarkType === 'text' ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              {t('pdfWatermark.text')}
              <input
                data-testid="opt-text"
                type="text"
                value={options.text}
                placeholder={t('pdfWatermark.textPlaceholder')}
                onChange={(e) => setOpt({ text: e.target.value })}
                className="w-44 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('pdfWatermark.fontSize')}
              <input
                data-testid="opt-fontsize"
                type="number"
                min={8}
                max={200}
                value={options.fontSize}
                onChange={(e) => setOpt({ fontSize: e.target.value })}
                className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              {t('pdfWatermark.color')}
              <select
                data-testid="opt-color"
                value={options.color}
                onChange={(e) => setOpt({ color: e.target.value })}
                className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              >
                {COLOR_PRESETS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.labelKey)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p data-testid="ascii-note" className="text-xs text-amber-600 dark:text-amber-400">
            {t('pdfWatermark.asciiNote')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label
            data-testid="image-dropzone"
            onDragOver={(e) => {
              e.preventDefault()
              setImageDragOver(true)
            }}
            onDragLeave={() => setImageDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setImageDragOver(false)
              void handleImageFiles(e.dataTransfer.files)
            }}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              imageDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <input
              key={imageInputKey}
              data-testid="image-input"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                void handleImageFiles(e.target.files)
              }}
            />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {wmImageName ? wmImageName : t('pdfWatermark.imageDropHint')}
            </p>
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t('pdfWatermark.scale')}
            <input
              data-testid="opt-scale"
              type="number"
              min={10}
              max={200}
              value={options.scale}
              onChange={(e) => setOpt({ scale: e.target.value })}
              className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>
      )}

      {/* 通用选项：透明度 / 旋转 / 位置 / 页面范围 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          {t('pdfWatermark.opacity')}
          <input
            data-testid="opt-opacity"
            type="number"
            min={10}
            max={100}
            value={options.opacity}
            onChange={(e) => setOpt({ opacity: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <div className="flex items-center gap-1 text-sm">
          <span>{t('pdfWatermark.rotate')}</span>
          {ROTATE_PRESETS.map((deg) => (
            <button
              key={deg}
              data-testid={`opt-rotate-${deg}`}
              type="button"
              aria-pressed={options.rotate === String(deg)}
              onClick={() => setOpt({ rotate: String(deg) })}
              className={`rounded border px-2 py-1 ${
                options.rotate === String(deg)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            >
              {deg}°
            </button>
          ))}
          <input
            data-testid="opt-rotate"
            type="number"
            min={-180}
            max={180}
            aria-label={t('pdfWatermark.rotateCustom')}
            placeholder={t('pdfWatermark.rotateCustom')}
            value={options.rotate}
            onChange={(e) => setOpt({ rotate: e.target.value })}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm">{t('pdfWatermark.position')}</span>
          <div
            className="grid w-fit grid-cols-3 gap-1"
            role="group"
            aria-label={t('pdfWatermark.position')}
          >
            {POSITION_IDS.map((id) => (
              <button
                key={id}
                data-testid={`pos-${id}`}
                type="button"
                aria-pressed={options.position === id}
                onClick={() => setOpt({ position: id })}
                className={`rounded border px-2 py-1 text-xs ${
                  options.position === id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              >
                {t(POSITION_LABEL_KEYS[id])}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm">{t('pdfWatermark.pageMode')}</span>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1">
              <input
                data-testid="opt-page-all"
                type="radio"
                name="page-mode"
                checked={options.pageMode === 'all'}
                onChange={() => setOpt({ pageMode: 'all' })}
              />
              {t('pdfWatermark.pageAll')}
            </label>
            <label className="flex items-center gap-1">
              <input
                data-testid="opt-page-custom"
                type="radio"
                name="page-mode"
                checked={options.pageMode === 'custom'}
                onChange={() => setOpt({ pageMode: 'custom' })}
              />
              {t('pdfWatermark.pageCustom')}
            </label>
            {options.pageMode === 'custom' && (
              <input
                data-testid="opt-page-range"
                type="text"
                aria-label={t('pdfWatermark.pageRange')}
                placeholder={t('pdfWatermark.pageRangePlaceholder')}
                value={options.pageRange}
                onChange={(e) => setOpt({ pageRange: e.target.value })}
                className="w-32 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            )}
          </div>
        </div>
      </div>

      {/* 操作区 */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid="apply"
          type="button"
          disabled={!pdfName || processing}
          onClick={() => void apply()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {t('pdfWatermark.apply')}
        </button>
        {(pdfName || result) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfWatermark.reset')}
          </button>
        )}
      </div>

      {processing && <p data-testid="processing">{t('pdfWatermark.processing')}</p>}
      {/* 错误容器用 !== null 判定：即使文案缺失（i18n key 待合并时 t() 返回 undefined），
          已设置的错误态也会渲染容器，便于结构断言；key 合并后行为与 {error &&} 完全一致 */}
      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfWatermark.resultInfo')}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfWatermark.download')}
          </button>
        </div>
      )}
    </div>
  )
}
