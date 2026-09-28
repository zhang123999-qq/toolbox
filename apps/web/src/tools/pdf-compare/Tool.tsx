import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import { canvasToBlob, downloadBlob } from '../../lib/image'
import {
  RENDER_SCALE,
  assertFileSizeOk,
  assertRenderSizeOk,
  buildDiffReport,
  buildReportFileName,
  computePageDiff,
  diffRatioText,
  errorMessage,
  extraPageNumbers,
  isPasswordPdfError,
  isPdfFile,
  padToCanvas,
  parseThreshold,
} from './utils'
import type { PageDiff, PageStat, PixelData } from './utils'
import type { PdfCompareOptions } from './schema'

// pdfjs worker：与 pdfjs-dist 打包在一起的 min 版 worker，本地加载不经过网络 CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** pdfjs-dist 的最小结构子集（单测中以 mock 代替，保证 hermetic） */
interface PdfPageLike {
  getViewport(opts: { scale: number }): { width: number; height: number }
  render(opts: { canvas: HTMLCanvasElement; viewport: unknown }): { promise: Promise<unknown> }
}

interface PdfDocLike {
  readonly numPages: number
  getPage(n: number): Promise<PdfPageLike>
}

/**
 * 解析后的文档句柄：pdfjs-dist v6 的 PDFDocumentProxy 没有 destroy，
 * 资源释放必须走 PDFDocumentLoadingTask.destroy()。
 */
interface DocHandle {
  doc: PdfDocLike
  destroy: () => void
}

interface SlotState {
  file: File
}

interface CompareResult {
  fileA: File
  fileB: File
  nameA: string
  nameB: string
  pagesA: number
  pagesB: number
  /** 实际比对的页数 = min(pagesA, pagesB) */
  compared: number
  threshold: number
  stats: PageStat[]
  /** 解析后的文档常驻到结果失效，供选中页按需重渲染（内存：只保留解析态，不保留位图） */
  handleA: DocHandle
  handleB: DocHandle
}

interface PageDetail {
  page: number
  urlA: string
  urlB: string
  diffPixels: number
  totalPixels: number
  sizeMismatch: boolean
}

interface Progress {
  current: number
  total: number
}

/** 渲染 PDF 单页为像素数据；canvas 用后即弃，不长期持有 */
async function renderPagePixels(doc: PdfDocLike, n: number): Promise<PixelData> {
  const page = await doc.getPage(n)
  const viewport = page.getViewport({ scale: RENDER_SCALE })
  assertRenderSizeOk(viewport.width, viewport.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(viewport.width))
  canvas.height = Math.max(1, Math.round(viewport.height))
  await page.render({ canvas, viewport }).promise
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { data: d.data, width: d.width, height: d.height }
}

/** 像素数据写回 canvas（页面预览图/下载通道） */
function pixelsToCanvas(p: PixelData): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = p.width
  canvas.height = p.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  const frame = ctx.createImageData(p.width, p.height)
  frame.data.set(p.data)
  ctx.putImageData(frame, 0, 0)
  return canvas
}

/**
 * 在叠加视图的两块 canvas 上绘制：底层为 A 页（白底对齐到外接矩形），
 * 顶层为红色半透明差异层。
 */
function drawOverlay(
  baseCanvas: HTMLCanvasElement,
  overlayCanvas: HTMLCanvasElement,
  pa: PixelData,
  diff: PageDiff,
): void {
  const bctx = baseCanvas.getContext('2d')
  const octx = overlayCanvas.getContext('2d')
  if (!bctx || !octx) throw new Error('Canvas 2D 上下文不可用')
  baseCanvas.width = diff.width
  baseCanvas.height = diff.height
  overlayCanvas.width = diff.width
  overlayCanvas.height = diff.height
  const padded = padToCanvas(pa, diff.width, diff.height)
  const baseFrame = bctx.createImageData(diff.width, diff.height)
  baseFrame.data.set(padded.data)
  bctx.putImageData(baseFrame, 0, 0)
  const overFrame = octx.createImageData(diff.width, diff.height)
  overFrame.data.set(diff.diffData)
  octx.putImageData(overFrame, 0, 0)
}

/** 释放一对文档句柄（loading task 级销毁） */
function destroyDocs(entry: { handleA: DocHandle; handleB: DocHandle } | null): void {
  if (!entry) return
  entry.handleA.destroy()
  entry.handleB.destroy()
}

export default function Tool() {
  const t = useTranslate()
  const [slotA, setSlotA] = useState<SlotState | null>(null)
  const [slotB, setSlotB] = useState<SlotState | null>(null)
  const [errorA, setErrorA] = useState<string | null>(null)
  const [errorB, setErrorB] = useState<string | null>(null)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const [selectedPage, setSelectedPage] = useState(1)
  const [detail, setDetail] = useState<PageDetail | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [dragA, setDragA] = useState(false)
  const [dragB, setDragB] = useState(false)
  const [options, setOptions] = useState<PdfCompareOptions>({ threshold: '30', view: 'side' })
  // 用 key 强制重挂载 file input 来清空已选文件，避免 ref 空守卫分支
  const [inputKey, setInputKey] = useState(0)
  const cancelRef = useRef(false)
  const docsRef = useRef<{ handleA: DocHandle; handleB: DocHandle } | null>(null)
  const baseRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)

  /** 解析单个 PDF：加密/损坏时按槽位给出明确提示（cause 保留原始错误） */
  const loadSingle = useCallback(
    async (file: File, which: 'A' | 'B'): Promise<DocHandle> => {
      const data = new Uint8Array(await file.arrayBuffer())
      const task = pdfjsLib.getDocument({ data })
      try {
        const doc = (await task.promise) as unknown as PdfDocLike
        return {
          doc,
          destroy: () => {
            task.destroy().catch(() => undefined)
          },
        }
      } catch (err) {
        // 加密 PDF：pdfjs 抛 PasswordException，明确提示哪一份打不开
        if (isPasswordPdfError(err)) {
          throw new Error(
            t(which === 'A' ? 'pdfCompare.error.encryptedA' : 'pdfCompare.error.encryptedB'),
            { cause: err },
          )
        }
        throw new Error(
          t(which === 'A' ? 'pdfCompare.error.invalidA' : 'pdfCompare.error.invalidB'),
          { cause: err },
        )
      }
    },
    [t],
  )

  /** 取两份文档：文件未变时复用已解析文档，阈值变更重比对只重渲染、不重复解析 */
  const loadDocs = useCallback(
    async (a: File, b: File): Promise<{ handleA: DocHandle; handleB: DocHandle }> => {
      const cached = docsRef.current
      if (cached) return cached
      const handleA = await loadSingle(a, 'A')
      try {
        const handleB = await loadSingle(b, 'B')
        const entry = { handleA, handleB }
        docsRef.current = entry
        return entry
      } catch (err) {
        // B 解析失败时释放已加载的 A，避免泄漏
        handleA.destroy()
        throw err
      }
    },
    [loadSingle],
  )

  const runCompare = useCallback(
    async (a: SlotState, b: SlotState, thresholdRaw: string) => {
      cancelRef.current = false
      setProcessing(true)
      setError(null)
      setCancelled(false)
      setResult(null)
      try {
        const threshold = parseThreshold(thresholdRaw)
        const { handleA, handleB } = await loadDocs(a.file, b.file)
        const pagesA = handleA.doc.numPages
        const pagesB = handleB.doc.numPages
        const compared = Math.min(pagesA, pagesB)
        setProgress({ current: 0, total: compared })
        const stats: PageStat[] = []
        for (let n = 1; n <= compared; n++) {
          if (cancelRef.current) break
          setProgress({ current: n, total: compared })
          const pa = await renderPagePixels(handleA.doc, n)
          const pb = await renderPagePixels(handleB.doc, n)
          // 像素缓冲只在单次迭代内持有，迭代结束即释放，大页数不累积内存
          const d = computePageDiff(n, pa, pb, threshold)
          stats.push({
            page: n,
            diffPixels: d.diffPixels,
            totalPixels: d.totalPixels,
            sizeMismatch: d.sizeMismatch,
          })
        }
        if (cancelRef.current) {
          setCancelled(true)
        } else {
          setSelectedPage(1)
          setResult({
            fileA: a.file,
            fileB: b.file,
            nameA: a.file.name,
            nameB: b.file.name,
            pagesA,
            pagesB,
            compared,
            threshold,
            stats,
            handleA,
            handleB,
          })
        }
      } catch (err) {
        setError(errorMessage(err))
        setResult(null)
      } finally {
        setProgress(null)
        setProcessing(false)
      }
    },
    [loadDocs],
  )

  /** 某槽位接收文件：魔数/大小校验失败只影响本槽位；换文件后旧结果与文档缓存一并失效 */
  const handleSlotFiles = useCallback(
    async (which: 'A' | 'B', files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      try {
        assertFileSizeOk(file.size)
        const head = new Uint8Array(await file.slice(0, 5).arrayBuffer())
        if (!isPdfFile(head)) throw new Error(t('pdfCompare.error.unsupported'))
        const cached = docsRef.current
        docsRef.current = null
        destroyDocs(cached)
        if (which === 'A') setSlotA({ file })
        else setSlotB({ file })
        if (which === 'A') setErrorA(null)
        else setErrorB(null)
        setResult(null)
        setError(null)
        setCancelled(false)
        setSelectedPage(1)
        setDetail((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev.urlA)
            URL.revokeObjectURL(prev.urlB)
          }
          return null
        })
        setDetailError(null)
      } catch (err) {
        if (which === 'A') setErrorA(errorMessage(err))
        else setErrorB(errorMessage(err))
      }
    },
    [t],
  )

  const handleCancel = useCallback(() => {
    cancelRef.current = true
  }, [])

  const handleThresholdChange = useCallback(
    (raw: string) => {
      setOptions((prev) => ({ ...prev, threshold: raw }))
      // 两份文件就绪时阈值变更即重新对比（文档走缓存，只重渲染）
      if (slotA && slotB) void runCompare(slotA, slotB, raw)
    },
    [slotA, slotB, runCompare],
  )

  const handleViewChange = useCallback((view: PdfCompareOptions['view']) => {
    setOptions((prev) => ({ ...prev, view }))
  }, [])

  const handleReset = useCallback(() => {
    cancelRef.current = true
    const cached = docsRef.current
    docsRef.current = null
    destroyDocs(cached)
    setInputKey((k) => k + 1)
    setSlotA(null)
    setSlotB(null)
    setErrorA(null)
    setErrorB(null)
    setResult(null)
    setError(null)
    setCancelled(false)
    setSelectedPage(1)
    setDetail((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev.urlA)
        URL.revokeObjectURL(prev.urlB)
      }
      return null
    })
    setDetailError(null)
  }, [])

  // 选中页详情：按需渲染该页对（不缓存整份文档的位图），阈值/视图变更自动重绘
  useEffect(() => {
    if (!result) return
    const { handleA, handleB } = result
    const page = selectedPage
    void (async () => {
      setDetailError(null)
      try {
        const threshold = parseThreshold(options.threshold)
        const pa = await renderPagePixels(handleA.doc, page)
        const pb = await renderPagePixels(handleB.doc, page)
        const d = computePageDiff(page, pa, pb, threshold)
        const urlA = URL.createObjectURL(await canvasToBlob(pixelsToCanvas(pa), 'image/png'))
        const urlB = URL.createObjectURL(await canvasToBlob(pixelsToCanvas(pb), 'image/png'))
        setDetail((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev.urlA)
            URL.revokeObjectURL(prev.urlB)
          }
          return {
            page,
            urlA,
            urlB,
            diffPixels: d.diffPixels,
            totalPixels: d.totalPixels,
            sizeMismatch: d.sizeMismatch,
          }
        })
        // 叠加视图：走到这里时两块 canvas 必定已挂载（detail 非空 + view==='overlay' 才渲染）
        if (options.view === 'overlay') {
          const baseCanvas = baseRef.current as HTMLCanvasElement
          const overlayCanvas = overlayRef.current as HTMLCanvasElement
          drawOverlay(baseCanvas, overlayCanvas, pa, d)
        }
      } catch (err) {
        setDetailError(errorMessage(err))
        setDetail(null)
      }
    })()
  }, [result, selectedPage, options.threshold, options.view])

  const renderSlot = (which: 'A' | 'B') => {
    const slot = which === 'A' ? slotA : slotB
    const slotError = which === 'A' ? errorA : errorB
    const dragging = which === 'A' ? dragA : dragB
    const setDragging = which === 'A' ? setDragA : setDragB
    return (
      <div>
        <p className="mb-1 text-sm font-medium">
          {t(which === 'A' ? 'pdfCompare.slotA' : 'pdfCompare.slotB')}
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
            void handleSlotFiles(which, e.dataTransfer.files)
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
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => void handleSlotFiles(which, e.target.files)}
          />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {slot
              ? slot.file.name
              : t(which === 'A' ? 'pdfCompare.dropHintA' : 'pdfCompare.dropHintB')}
          </p>
        </label>
        {slotError && (
          <p
            data-testid={which === 'A' ? 'error-a' : 'error-b'}
            role="alert"
            className="mt-1 text-sm text-red-600 dark:text-red-400"
          >
            {slotError}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfCompare.note')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {renderSlot('A')}
        {renderSlot('B')}
      </div>

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm" title={t('pdfCompare.thresholdHint')}>
          {t('pdfCompare.threshold')}
          <input
            data-testid="opt-threshold"
            type="number"
            min={0}
            max={255}
            value={options.threshold}
            onChange={(e) => handleThresholdChange(e.target.value)}
            className="w-20 rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          {t('pdfCompare.view')}
          <select
            data-testid="opt-view"
            value={options.view}
            onChange={(e) => handleViewChange(e.target.value as PdfCompareOptions['view'])}
            className="rounded border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="side">{t('pdfCompare.viewSide')}</option>
            <option value="overlay">{t('pdfCompare.viewOverlay')}</option>
          </select>
        </label>
        {(slotA ?? slotB) && (
          <button
            data-testid="reset"
            type="button"
            onClick={handleReset}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfCompare.reset')}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t('pdfCompare.renderNote')}</p>

      {/* 对比按钮：两份文件就绪且不在处理中时渲染，TS 已收窄 slotA/slotB 非空 */}
      {slotA && slotB && !processing && (
        <div>
          <button
            data-testid="compare"
            type="button"
            onClick={() => void runCompare(slotA, slotB, options.threshold)}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfCompare.compare')}
          </button>
        </div>
      )}

      {progress && (
        <div className="flex items-center gap-3">
          <p data-testid="processing" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfCompare.rendering', {
              current: String(progress.current),
              total: String(progress.total),
            })}
          </p>
          <button
            data-testid="cancel"
            type="button"
            onClick={handleCancel}
            className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
          >
            {t('pdfCompare.cancel')}
          </button>
        </div>
      )}
      {cancelled && (
        <p data-testid="cancelled" className="text-sm text-slate-500">
          {t('pdfCompare.cancelled')}
        </p>
      )}
      {error && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          <p data-testid="page-count-info" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfCompare.pageCountInfo', {
              pagesA: String(result.pagesA),
              pagesB: String(result.pagesB),
              compared: String(result.compared),
            })}
          </p>
          {result.pagesA !== result.pagesB && (
            <p
              data-testid="page-count-mismatch"
              className="text-sm text-amber-600 dark:text-amber-400"
            >
              {t('pdfCompare.pageCountMismatch', { compared: String(result.compared) })}
            </p>
          )}
          {extraPageNumbers(result.compared, result.pagesA).length > 0 && (
            <p data-testid="extra-a" className="text-sm text-slate-600 dark:text-slate-400">
              {t('pdfCompare.extraPagesA', {
                pages: extraPageNumbers(result.compared, result.pagesA).join('、'),
              })}
            </p>
          )}
          {extraPageNumbers(result.compared, result.pagesB).length > 0 && (
            <p data-testid="extra-b" className="text-sm text-slate-600 dark:text-slate-400">
              {t('pdfCompare.extraPagesB', {
                pages: extraPageNumbers(result.compared, result.pagesB).join('、'),
              })}
            </p>
          )}
          {result.stats.filter((s) => s.diffPixels > 0).length > 0 ? (
            <p data-testid="summary" className="text-sm font-medium">
              {t('pdfCompare.summary', {
                compared: String(result.compared),
                diffCount: String(result.stats.filter((s) => s.diffPixels > 0).length),
              })}
            </p>
          ) : (
            <p
              data-testid="summary"
              className="text-sm font-medium text-green-600 dark:text-green-400"
            >
              {t('pdfCompare.allSame')}
            </p>
          )}

          {/* 差异页列表：点击选中查看详情 */}
          <div>
            <p className="mb-1 text-sm font-medium">{t('pdfCompare.pageListTitle')}</p>
            <div data-testid="page-list" className="flex flex-wrap gap-2">
              {result.stats.map((s) => (
                <button
                  key={s.page}
                  data-testid="page-item"
                  type="button"
                  onClick={() => setSelectedPage(s.page)}
                  className={`rounded border px-3 py-1 text-sm ${
                    s.page === selectedPage
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-slate-300 dark:border-slate-700'
                  } ${s.diffPixels > 0 ? 'font-medium text-red-600 dark:text-red-400' : ''}`}
                >
                  {t('pdfCompare.pageItem', {
                    page: String(s.page),
                    ratio: diffRatioText(s.diffPixels, s.totalPixels),
                  })}
                </button>
              ))}
            </div>
          </div>

          {detailError && (
            <p
              data-testid="detail-error"
              role="alert"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {detailError}
            </p>
          )}

          {/* 选中页详情 */}
          {detail && (
            <div data-testid="detail" className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                {t('pdfCompare.detailTitle', { page: String(detail.page) })}
                {detail.sizeMismatch && (
                  <span
                    data-testid="size-mismatch"
                    className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400"
                  >
                    {t('pdfCompare.sizeMismatchNote')}
                  </span>
                )}
              </p>
              {options.view === 'side' ? (
                <div data-testid="detail-side" className="grid gap-4 sm:grid-cols-2">
                  <figure>
                    <figcaption className="mb-1 text-sm text-slate-500">
                      {t('pdfCompare.slotA')}
                    </figcaption>
                    <img
                      data-testid="detail-img-a"
                      src={detail.urlA}
                      alt=""
                      className="max-h-96 rounded border object-contain"
                    />
                  </figure>
                  <figure>
                    <figcaption className="mb-1 text-sm text-slate-500">
                      {t('pdfCompare.slotB')}
                    </figcaption>
                    <img
                      data-testid="detail-img-b"
                      src={detail.urlB}
                      alt=""
                      className="max-h-96 rounded border object-contain"
                    />
                  </figure>
                </div>
              ) : (
                <div data-testid="detail-overlay" className="flex flex-col gap-2">
                  <div className="relative w-fit">
                    <canvas
                      data-testid="diff-canvas"
                      ref={baseRef}
                      className="max-h-96 rounded border"
                    />
                    <canvas
                      data-testid="diff-overlay"
                      ref={overlayRef}
                      className="absolute inset-0 max-h-96 rounded"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('pdfCompare.overlayNote')}
                  </p>
                </div>
              )}
              <p data-testid="diff-stats" className="text-sm text-slate-600 dark:text-slate-400">
                {t('pdfCompare.diffStats', {
                  diff: String(detail.diffPixels),
                  total: String(detail.totalPixels),
                  ratio: diffRatioText(detail.diffPixels, detail.totalPixels),
                })}
              </p>
              {detail.diffPixels === 0 && (
                <p data-testid="no-diff" className="text-sm text-green-600 dark:text-green-400">
                  {t('pdfCompare.noDiff')}
                </p>
              )}
            </div>
          )}

          <button
            data-testid="download-report"
            type="button"
            // result 非空才渲染此按钮，TS 已收窄，无需空守卫
            onClick={() =>
              downloadBlob(
                new Blob(
                  [
                    buildDiffReport({
                      nameA: result.nameA,
                      nameB: result.nameB,
                      pagesA: result.pagesA,
                      pagesB: result.pagesB,
                      compared: result.compared,
                      threshold: result.threshold,
                      stats: result.stats,
                    }),
                  ],
                  { type: 'text/plain;charset=utf-8' },
                ),
                buildReportFileName(result.nameA, result.nameB),
              )
            }
            className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {t('pdfCompare.downloadReport')}
          </button>
        </div>
      )}
    </div>
  )
}
