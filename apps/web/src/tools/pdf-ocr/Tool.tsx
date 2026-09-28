import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentLoadingTask } from 'pdfjs-dist'
import { useTranslate } from '../../i18n'
import { downloadBlob } from '../../lib/image'
import {
  OCR_RENDER_SCALE,
  assertFileSizeOk,
  buildOutputFileName,
  computeRenderDimensions,
  errorMessage,
  formatFailedBlock,
  formatPageBlock,
  isPasswordPdfError,
  isPdfFile,
  mergePageTexts,
  parseLangs,
  progressRatio,
  terminateWorker,
} from './utils'
import type { OcrWorker } from './utils'
import type { PdfOcrOptions } from './schema'

// pdfjs worker：与 pdfjs-dist 打包在一起的 min 版 worker，本地加载不经过网络 CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

/** 识别结果：合并文本 + 下载文件名 + 页数 + 失败页（合并为一个 state，避免渲染条件分支） */
interface OcrResult {
  text: string
  fileName: string
  pageCount: number
  failedPages: number[]
}

/** 逐页进度：current 为当前正在识别的页码（1 起），total 为总页数 */
interface Progress {
  current: number
  total: number
}

export default function Tool() {
  const t = useTranslate()
  const workerRef = useRef<OcrWorker | null>(null)
  const runRef = useRef(0)
  const [inputKey, setInputKey] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [fileName, setFileName] = useState('')
  const [processing, setProcessing] = useState(false)
  const [engineLoading, setEngineLoading] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [pageFrac, setPageFrac] = useState(0)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [options, setOptions] = useState<PdfOcrOptions>({ chiSim: '1', eng: '1' })

  // 卸载时终止残留 worker，避免后台继续占用线程
  useEffect(() => {
    return () => {
      runRef.current += 1
      const w = workerRef.current
      workerRef.current = null
      void terminateWorker(w)
    }
  }, [])

  const runOcr = useCallback(
    async (file: File, opts: PdfOcrOptions) => {
      const myRun = runRef.current + 1
      runRef.current = myRun
      const alive = () => runRef.current === myRun

      setProcessing(true)
      setError(null)
      setResult(null)
      setCopied(false)
      setFileName(file.name)
      setProgress(null)
      setPageFrac(0)
      setEngineLoading(false)

      // 同一时间只允许一个识别任务：新任务先终止旧 worker
      const old = workerRef.current
      workerRef.current = null
      await terminateWorker(old)

      let loadingTask: PDFDocumentLoadingTask | null = null
      try {
        assertFileSizeOk(file.size)
        const bytes = new Uint8Array(await file.arrayBuffer())
        if (!isPdfFile(bytes)) throw new Error(t('pdfOcr.error.unsupported'))
        const langs = parseLangs(opts.chiSim, opts.eng)

        loadingTask = pdfjsLib.getDocument({ data: bytes })
        const doc = await loadingTask.promise
        if (!alive()) return
        const total = doc.numPages
        setProgress({ current: 0, total })

        // tesseract.js 按需懒加载：首屏不打包识别引擎
        setEngineLoading(true)
        const { createWorker } = await import('tesseract.js')
        const worker = await createWorker(langs, undefined, {
          logger: (m) => {
            if (!alive()) return
            // 只取页内识别进度驱动进度条；引擎/语言包加载阶段显示静态文案
            if (m.status === 'recognizing text') setPageFrac(m.progress)
          },
        })
        workerRef.current = worker
        setEngineLoading(false)
        if (!alive()) {
          // 等待引擎期间被取消或被新任务取代：立即释放刚建好的 worker
          workerRef.current = null
          await terminateWorker(worker)
          return
        }

        const blocks: string[] = []
        const failedPages: number[] = []
        // 循环体内每次 await 后都有 alive 检查：取消/取代只能发生在 await 点，
        // 因此此处不需要循环首尾的重复检查（其 false 分支不可达）
        for (let n = 1; n <= total; n++) {
          setProgress({ current: n, total })
          setPageFrac(0)
          try {
            const page = await doc.getPage(n)
            const viewport = page.getViewport({ scale: OCR_RENDER_SCALE })
            const { width, height } = computeRenderDimensions(viewport.width, viewport.height)
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            await page.render({ canvas, viewport }).promise
            if (!alive()) return
            const { data } = await worker.recognize(canvas)
            // 逐页释放 canvas 内存，避免大 PDF 常驻内存
            canvas.width = 0
            canvas.height = 0
            if (!alive()) return
            blocks.push(formatPageBlock(n, data.text))
          } catch (err) {
            // 任务已被取消/取代：不记录失败页，直接退出；单页失败不中断整体
            if (alive()) {
              failedPages.push(n)
              blocks.push(formatFailedBlock(n, errorMessage(err)))
            }
          }
        }
        // 最后一个 await（recognize / 失败页的 catch）之后均为同步代码，
        // alive 状态不可能再变化，直接合并结果
        setResult({
          text: mergePageTexts(blocks),
          fileName: buildOutputFileName(file.name),
          pageCount: total,
          failedPages,
        })
      } catch (err) {
        // 被取消/取代后不写入错误
        if (alive()) {
          if (isPasswordPdfError(err)) setError(t('pdfOcr.error.encrypted'))
          else setError(errorMessage(err))
          setResult(null)
        }
      } finally {
        // 释放 pdfjs 加载任务：中止未完成的加载并销毁其 worker 线程；销毁失败静默
        await loadingTask?.destroy().catch(() => undefined)
        // 存活才做收尾：过期任务（被取消/被新任务取代）不碰任何状态
        if (alive()) {
          setProcessing(false)
          setEngineLoading(false)
          setProgress(null)
          setPageFrac(0)
          // 任务结束即释放 worker，下次识别重建（语言包有缓存，二次加载很快）
          const w = workerRef.current
          workerRef.current = null
          await terminateWorker(w)
        }
      }
    },
    [t],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0]
      if (!file) return
      void runOcr(file, options)
    },
    [options, runOcr],
  )

  const handleLangChange = useCallback((key: 'chiSim' | 'eng', checked: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: checked ? '1' : '' }))
  }, [])

  const handleCancel = useCallback(async () => {
    runRef.current += 1
    const w = workerRef.current
    workerRef.current = null
    await terminateWorker(w)
    setProcessing(false)
    setEngineLoading(false)
    setProgress(null)
    setPageFrac(0)
    setError(t('pdfOcr.cancelled'))
  }, [t])

  const handleCopy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
      } catch {
        // clipboard 不可用或被拒绝时降级为错误提示，用户可手动选择文本复制
        setError(t('pdfOcr.error.copyFailed'))
      }
    },
    [t],
  )

  const handleDownload = useCallback((text: string, name: string) => {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), name)
  }, [])

  const handleReset = useCallback(async () => {
    runRef.current += 1
    const w = workerRef.current
    workerRef.current = null
    await terminateWorker(w)
    setInputKey((k) => k + 1)
    setResult(null)
    setFileName('')
    setError(null)
    setProcessing(false)
    setEngineLoading(false)
    setProgress(null)
    setPageFrac(0)
    setCopied(false)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      {/* 隐私告知：tesseract.js 从 CDN 下载引擎与语言包，PDF 本身不上传 —— 显著位置 */}
      <p
        data-testid="cdn-notice"
        className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
      >
        {t('pdfOcr.cdnNotice')}
      </p>
      <p className="text-sm text-slate-600 dark:text-slate-400">{t('pdfOcr.note')}</p>

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
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {fileName ? fileName : t('pdfOcr.dropHint')}
        </p>
      </label>

      {/* 语言选项 */}
      <fieldset className="flex flex-wrap items-center gap-4">
        <legend className="text-sm text-slate-600 dark:text-slate-400">
          {t('pdfOcr.languages')}
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            data-testid="opt-chiSim"
            type="checkbox"
            checked={options.chiSim === '1'}
            onChange={(e) => handleLangChange('chiSim', e.target.checked)}
          />
          {t('pdfOcr.lang.chiSim')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            data-testid="opt-eng"
            type="checkbox"
            checked={options.eng === '1'}
            onChange={(e) => handleLangChange('eng', e.target.checked)}
          />
          {t('pdfOcr.lang.eng')}
        </label>
      </fieldset>

      {/* 进度：总进度条 + 当前页码 + 可取消 */}
      {processing && (
        <div data-testid="progress" className="flex flex-col gap-2">
          <div className="h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700">
            <div
              data-testid="progress-bar"
              className="h-full rounded bg-blue-600 transition-all"
              style={{
                width: `${
                  progress === null
                    ? 0
                    : Math.round(
                        progressRatio(progress.current - 1, pageFrac, progress.total) * 100,
                      )
                }%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p data-testid="progress-label" className="text-sm text-slate-600 dark:text-slate-400">
              {engineLoading && (
                <span data-testid="engine-loading">{t('pdfOcr.loadingEngine')}</span>
              )}
              {!engineLoading && progress === null && (
                <span data-testid="preparing">{t('pdfOcr.preparing')}</span>
              )}
              {!engineLoading && progress !== null && (
                <>
                  {t('pdfOcr.recognizing')}{' '}
                  <span data-testid="progress-current">{progress.current}</span>/
                  <span data-testid="progress-total">{progress.total}</span> {t('pdfOcr.pageUnit')}
                </>
              )}
            </p>
            <button
              data-testid="cancel"
              type="button"
              onClick={() => void handleCancel()}
              className="rounded border border-slate-300 px-3 py-1 text-sm dark:border-slate-700"
            >
              {t('pdfOcr.cancel')}
            </button>
          </div>
        </div>
      )}

      {error !== null && (
        <p data-testid="error" role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* 结果：失败页提示 + 只读文本 + 统计 + 复制/下载 */}
      {result && (
        <div data-testid="result" className="flex flex-col gap-3">
          {result.failedPages.length > 0 && (
            <p
              data-testid="failed-pages"
              role="alert"
              className="text-sm text-amber-700 dark:text-amber-300"
            >
              {t('pdfOcr.failedPages')}：{result.failedPages.join(', ')}
            </p>
          )}
          <label className="flex flex-col gap-1 text-sm text-slate-600 dark:text-slate-400">
            {t('pdfOcr.result')}
            <textarea
              data-testid="result-text"
              readOnly
              rows={12}
              value={result.text}
              className="rounded border border-slate-300 p-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <p data-testid="stats" className="text-sm text-slate-600 dark:text-slate-400">
            {t('pdfOcr.statsPages')}: {result.pageCount} · {t('pdfOcr.statsChars')}:{' '}
            {result.text.length}
          </p>
          <div className="flex items-center gap-3">
            <button
              data-testid="copy"
              type="button"
              onClick={() => void handleCopy(result.text)}
              className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t('pdfOcr.copy')}
            </button>
            {copied && (
              <span data-testid="copied" className="text-sm text-green-600 dark:text-green-400">
                {t('pdfOcr.copied')}
              </span>
            )}
            <button
              data-testid="download"
              type="button"
              // result 非空才渲染此按钮，TS 已收窄，无需空守卫
              onClick={() => handleDownload(result.text, result.fileName)}
              className="w-fit rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              {t('pdfOcr.download')}
            </button>
            <button
              data-testid="reset"
              type="button"
              onClick={() => void handleReset()}
              className="rounded border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
            >
              {t('pdfOcr.reset')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
