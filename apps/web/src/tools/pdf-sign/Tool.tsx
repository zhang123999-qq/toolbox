import { useCallback, useRef, useState } from 'react'
import { useTranslate } from '../../i18n'
import type { MessageKey } from '../../i18n'
import { downloadBlob, formatBytes } from '../../lib/image'
import {
  SIG_CANVAS_HEIGHT,
  SIG_CANVAS_WIDTH,
  assertFileSizeOk,
  buildOutputFileName,
  computeSignatureRect,
  dataUrlToBytes,
  detectImageKind,
  embedSignature,
  getJpegDimensions,
  getPdfInfo,
  getPngDimensions,
  isEncryptedPdfError,
  isPdfFile,
  parsePageIndex,
  parseSliderValue,
  toCanvasPoint,
} from './utils'
import type { PdfSignOptions } from './schema'
import type { SignatureImageKind } from './utils'

interface PdfDoc {
  name: string
  bytes: Uint8Array
  pageCount: number
  pages: Array<{ width: number; height: number }>
}

interface UploadedSig {
  kind: SignatureImageKind
  data: Uint8Array
  width: number
  height: number
  url: string
  name: string
}

interface SignResult {
  url: string
  blob: Blob
  fileName: string
  pageCount: number
}

const DEFAULT_OPTIONS: PdfSignOptions = {
  page: '1',
  x: '65',
  y: '80',
  scale: '40',
  lineWidth: '4',
}

/**
 * PDF 签名（#491）：上传 PDF → 手写签名（画布，鼠标/触摸）或上传签名图片 →
 * 选择页码、位置、缩放 → pdf-lib 将签名位图嵌入页面 → 下载。
 *
 * 重要：本工具只做可视化电子签名（图片盖章），绝不伪造数字证书签名。
 * 错误状态存 MessageKey、渲染时才 t() 翻译：文案与 pdf-sign.i18n.json
 * 1:1 对应（词典由协调员合并，合并后 tsc 校验 key 对齐）。
 *
 * 不变式（无空守卫分支，按钮 disabled 保证）：
 * - 生成按钮仅在 pdf 非空时渲染，handleSign 直接收 target 参数；
 * - 生成按钮仅在有签名内容时可用：draw 模式下 drawnDataUrl 非空、
 *   upload 模式下 uploadedSig 非空，handleSign 内按此断言取数。
 */
export default function Tool() {
  const t = useTranslate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [pdf, setPdf] = useState<PdfDoc | null>(null)
  const [sigSource, setSigSource] = useState<'draw' | 'upload'>('draw')
  const [drawnDataUrl, setDrawnDataUrl] = useState<string | null>(null)
  const [uploadedSig, setUploadedSig] = useState<UploadedSig | null>(null)
  const [options, setOptions] = useState<PdfSignOptions>(DEFAULT_OPTIONS)
  const [result, setResult] = useState<SignResult | null>(null)
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null)
  const [processing, setProcessing] = useState(false)
  // 用 key 强制重挂载 file input / canvas 来清空已选文件与画布，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)
  const [sigInputKey, setSigInputKey] = useState(0)
  const [canvasKey, setCanvasKey] = useState(0)

  const hasSignature = sigSource === 'draw' ? drawnDataUrl !== null : uploadedSig !== null

  /**
   * 上传阶段校验：大小 → 魔数 → pdf-lib 载入读页数/尺寸
   *（加密单独转译为“已加密无法打开”，其余解析失败归为“文件损坏”）。
   */
  const handlePdfFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setErrorKey(null)
    setResult(null)
    try {
      assertFileSizeOk(file.size)
    } catch {
      setErrorKey('pdfSign.error.tooLarge')
      return
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!isPdfFile(bytes)) {
      setErrorKey('pdfSign.error.unsupported')
      return
    }
    try {
      const info = await getPdfInfo(bytes)
      setPdf({ name: file.name, bytes, pageCount: info.pageCount, pages: info.pages })
      setOptions((prev) => ({ ...prev, page: '1' }))
    } catch (err) {
      if (isEncryptedPdfError(err)) setErrorKey('pdfSign.error.encrypted')
      else setErrorKey('pdfSign.error.invalid')
    }
  }, [])

  /** 签名图片上传：仅接受 PNG/JPEG（pdf-lib 仅能嵌入这两种），并解析图片尺寸 */
  const handleSigImageFiles = useCallback(async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setErrorKey(null)
    const bytes = new Uint8Array(await file.arrayBuffer())
    const kind = detectImageKind(bytes)
    if (!kind) {
      setErrorKey('pdfSign.error.sigUnsupported')
      return
    }
    try {
      const dims = kind === 'png' ? getPngDimensions(bytes) : getJpegDimensions(bytes)
      setUploadedSig({
        kind,
        data: bytes,
        width: dims.width,
        height: dims.height,
        url: URL.createObjectURL(file),
        name: file.name,
      })
    } catch {
      setErrorKey('pdfSign.error.sigInvalid')
    }
  }, [])

  /** 指针按下开始一笔：指针事件同时覆盖鼠标与触摸 */
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = e.currentTarget
    try {
      // 指针捕获：手指滑出画布也能正常收笔；jsdom 等环境不支持时忽略
      canvas.setPointerCapture(e.pointerId)
    } catch {
      /* 忽略指针捕获失败，不影响绘制 */
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const p = toCanvasPoint(
      e.clientX,
      e.clientY,
      canvas.getBoundingClientRect(),
      SIG_CANVAS_WIDTH,
      SIG_CANVAS_HEIGHT,
    )
    drawingRef.current = true
    ctxRef.current = ctx
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = Number(options.lineWidth)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    // 点一下也留下墨点，避免“点了没反应”
    ctx.lineTo(p.x + 0.5, p.y + 0.5)
    ctx.stroke()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    // 不变式：drawing 为 true 时 ctxRef 必非空（pointerdown 中同时设置）
    const ctx = ctxRef.current as CanvasRenderingContext2D
    const canvas = e.currentTarget
    const p = toCanvasPoint(
      e.clientX,
      e.clientY,
      canvas.getBoundingClientRect(),
      SIG_CANVAS_WIDTH,
      SIG_CANVAS_HEIGHT,
    )
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
  }

  /** 收笔：把当前画布快照为 data URL，即为“签名内容” */
  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    drawingRef.current = false
    ctxRef.current = null
    setDrawnDataUrl(e.currentTarget.toDataURL('image/png'))
  }

  const handleClearCanvas = useCallback(() => {
    setCanvasKey((k) => k + 1)
    setDrawnDataUrl(null)
  }, [])

  const handleOptionChange = useCallback((patch: Partial<PdfSignOptions>) => {
    setOptions((prev) => ({ ...prev, ...patch }))
  }, [])

  /**
   * 生成签名 PDF：参数解析 → 取签名图片字节 → 计算落点 →
   * pdf-lib 嵌入 → 下载。按钮 disabled 保证 pdf/签名内容非空，
   * 此处无需空守卫；失败统一转译为“签名嵌入失败”。
   */
  const handleSign = useCallback(
    async (target: PdfDoc) => {
      setProcessing(true)
      setErrorKey(null)
      try {
        const pageIndex = parsePageIndex(options.page, target.pageCount)
        const xPct = parseSliderValue(options.x, '水平位置', 0, 100)
        const yPct = parseSliderValue(options.y, '垂直位置', 0, 100)
        const scalePct = parseSliderValue(options.scale, '缩放', 10, 300)
        const sig: { kind: SignatureImageKind; data: Uint8Array; width: number; height: number } =
          sigSource === 'draw'
            ? {
                kind: 'png',
                data: dataUrlToBytes(drawnDataUrl as string),
                width: SIG_CANVAS_WIDTH,
                height: SIG_CANVAS_HEIGHT,
              }
            : { ...(uploadedSig as UploadedSig) }
        const page = target.pages[pageIndex]
        const rect = computeSignatureRect(
          page.width,
          page.height,
          sig.width,
          sig.height,
          xPct,
          yPct,
          scalePct,
        )
        const out = await embedSignature(target.bytes, sig, pageIndex, rect)
        // 拷贝为确定性的 ArrayBuffer 视图后才可作 BlobPart
        const outCopy = new Uint8Array(out)
        const blob = new Blob([outCopy.buffer as ArrayBuffer], { type: 'application/pdf' })
        setResult({
          url: URL.createObjectURL(blob),
          blob,
          fileName: buildOutputFileName(target.name),
          pageCount: target.pageCount,
        })
      } catch {
        setErrorKey('pdfSign.error.signFailed')
        setResult(null)
      } finally {
        setProcessing(false)
      }
    },
    [options, sigSource, drawnDataUrl, uploadedSig],
  )

  const handleReset = useCallback(() => {
    setInputKey((k) => k + 1)
    setSigInputKey((k) => k + 1)
    setCanvasKey((k) => k + 1)
    setPdf(null)
    setDrawnDataUrl(null)
    setUploadedSig(null)
    setSigSource('draw')
    setOptions(DEFAULT_OPTIONS)
    setResult(null)
    setErrorKey(null)
  }, [])

  // 位置预览：与生成共用 computeSignatureRect，按百分比换算为 CSS 定位
  const sigDims =
    sigSource === 'draw'
      ? { width: SIG_CANVAS_WIDTH, height: SIG_CANVAS_HEIGHT }
      : uploadedSig
        ? { width: uploadedSig.width, height: uploadedSig.height }
        : null
  let previewStyle: React.CSSProperties | null = null
  if (pdf && sigDims) {
    const pageIndex = Math.min(Math.max(Number(options.page) - 1, 0), pdf.pages.length - 1)
    const page = pdf.pages[pageIndex]
    const rect = computeSignatureRect(
      page.width,
      page.height,
      sigDims.width,
      sigDims.height,
      Number(options.x),
      Number(options.y),
      Number(options.scale),
    )
    previewStyle = {
      left: `${(rect.x / page.width) * 100}%`,
      top: `${((page.height - rect.y - rect.height) / page.height) * 100}%`,
      width: `${(rect.width / page.width) * 100}%`,
      height: `${(rect.height / page.height) * 100}%`,
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfSign.note')}</p>
      <p
        data-testid="disclaimer"
        className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
      >
        {t('pdfSign.disclaimer')}
      </p>

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
          {pdf ? pdf.name : t('pdfSign.dropHint')}
        </p>
      </label>

      {/* 签名来源切换 */}
      <div className="flex gap-2">
        <button
          data-testid="tab-draw"
          type="button"
          onClick={() => setSigSource('draw')}
          className={`rounded border px-3 py-1.5 text-sm ${
            sigSource === 'draw'
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          {t('pdfSign.tabDraw')}
        </button>
        <button
          data-testid="tab-upload"
          type="button"
          onClick={() => setSigSource('upload')}
          className={`rounded border px-3 py-1.5 text-sm ${
            sigSource === 'upload'
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-slate-300 dark:border-slate-700'
          }`}
        >
          {t('pdfSign.tabUpload')}
        </button>
      </div>

      {sigSource === 'draw' ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('pdfSign.canvasHint')}</p>
          <canvas
            key={canvasKey}
            ref={canvasRef}
            data-testid="sig-canvas"
            width={SIG_CANVAS_WIDTH}
            height={SIG_CANVAS_HEIGHT}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
            className="w-full cursor-crosshair touch-none rounded border border-slate-300 bg-white dark:border-slate-700"
          />
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              {t('pdfSign.lineWidth')}
              <input
                data-testid="opt-linewidth"
                type="range"
                min={1}
                max={20}
                value={options.lineWidth}
                onChange={(e) => handleOptionChange({ lineWidth: e.target.value })}
                className="w-32"
              />
            </label>
            <button
              data-testid="clear-canvas"
              type="button"
              onClick={handleClearCanvas}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('pdfSign.clearCanvas')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label
            data-testid="sig-dropzone"
            className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-6 text-center dark:border-slate-700"
          >
            <input
              key={sigInputKey}
              data-testid="sig-input"
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                void handleSigImageFiles(e.target.files)
              }}
            />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {uploadedSig ? uploadedSig.name : t('pdfSign.sigDropHint')}
            </p>
          </label>
          {uploadedSig && (
            <img
              data-testid="sig-preview"
              src={uploadedSig.url}
              alt=""
              className="max-h-32 w-fit rounded border border-slate-300 object-contain dark:border-slate-700"
            />
          )}
        </div>
      )}

      {/* 位置选项：需先有 PDF（页数/尺寸未知时无意义） */}
      {pdf && (
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            {t('pdfSign.pageLabel')}
            <select
              data-testid="opt-page"
              value={options.page}
              onChange={(e) => handleOptionChange({ page: e.target.value })}
              className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            >
              {pdf.pages.map((_, i) => (
                <option key={i} value={String(i + 1)}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t('pdfSign.xLabel')}
            <input
              data-testid="opt-x"
              type="range"
              min={0}
              max={100}
              value={options.x}
              onChange={(e) => handleOptionChange({ x: e.target.value })}
              className="w-32"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t('pdfSign.yLabel')}
            <input
              data-testid="opt-y"
              type="range"
              min={0}
              max={100}
              value={options.y}
              onChange={(e) => handleOptionChange({ y: e.target.value })}
              className="w-32"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            {t('pdfSign.scaleLabel')}
            <input
              data-testid="opt-scale"
              type="range"
              min={10}
              max={300}
              value={options.scale}
              onChange={(e) => handleOptionChange({ scale: e.target.value })}
              className="w-32"
            />
          </label>
        </div>
      )}

      {/* 位置预览：签名在页面上的落点示意 */}
      {pdf && previewStyle && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('pdfSign.previewTitle')}</p>
          <div
            data-testid="position-preview"
            className="relative h-48 w-36 rounded border border-slate-300 bg-white dark:border-slate-700"
          >
            <div
              data-testid="position-marker"
              className="absolute border border-blue-600 bg-blue-500/40"
              style={previewStyle}
            />
          </div>
        </div>
      )}

      {/* 操作区：生成按钮仅在 pdf 非空时渲染；无签名内容时禁用 */}
      {pdf && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            data-testid="sign"
            type="button"
            disabled={!hasSignature || processing}
            onClick={() => void handleSign(pdf)}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t('pdfSign.sign')}
          </button>
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfSign.reset')}
          </button>
        </div>
      )}

      {processing && <p data-testid="processing">{t('pdfSign.processing')}</p>}
      {errorKey && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t(errorKey)}
        </p>
      )}

      {/* 结果：result 非空才渲染，TS 已收窄，无需空守卫 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="result-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfSign.resultInfo')}：{result.pageCount}
            {t('pdfSign.pageUnit')}（{formatBytes(result.blob.size)}）
          </p>
          <button
            data-testid="download"
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfSign.download')}
          </button>
        </div>
      )}
    </div>
  )
}
