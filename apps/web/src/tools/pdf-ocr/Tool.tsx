import { useState } from 'react'
import type { ChangeEvent } from 'react'
// pdfjs worker 以 Vite `?url` 方式引入：构建时产出为独立 asset，只取 URL 字符串，
// 不把 worker 代码打进主包。文件名已核实：node_modules/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { createWorker } from 'tesseract.js'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import {
  OCR_LANGUAGES,
  OCR_LANGUAGE_LABELS,
  OCR_RENDER_SCALE,
  checkOcrPageCount,
  cleanOcrText,
  describeOcrEngineError,
  describePdfError,
  mergeOcrPages,
  ocrOverallProgress,
  ocrStageText,
  validateOcrFile,
} from './utils'
import type { OcrPageResult, OcrStage } from './utils'
import type { PdfOcrInput, PdfOcrOptions } from './schema'

type RunStatus = 'idle' | 'busy' | 'done' | 'error'

interface OcrViewState {
  readonly status: RunStatus
  readonly fileName: string
  readonly total: number
  readonly done: number
  readonly pageFraction: number
  readonly stage: OcrStage | null
  readonly pages: readonly OcrPageResult[]
  readonly error: string
}

const IDLE_STATE: OcrViewState = {
  status: 'idle',
  fileName: '',
  total: 0,
  done: 0,
  pageFraction: 0,
  stage: null,
  pages: [],
  error: '',
}

const EXAMPLE: PdfOcrInput = {
  text: '在右侧点「选择 PDF 文件」，逐页渲染后做 OCR 识别，全程在浏览器本地运行。',
}

/** 从 unknown 取中文错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export default function Tool() {
  const t = useTranslate()
  const [view, setView] = useState<OcrViewState>(IDLE_STATE)

  const optionDefs: readonly OptionDef<PdfOcrOptions>[] = [
    {
      key: 'language',
      label: '识别语言',
      kind: 'select',
      values: [...OCR_LANGUAGES],
    },
  ]

  /** 核心流程：pdfjs 渲染页面 → tesseract 逐页识别；两处动态 import 都包 try/catch */
  async function handleFile(file: File, language: PdfOcrOptions['language']): Promise<void> {
    try {
      validateOcrFile(file)
    } catch (error) {
      setView({ ...IDLE_STATE, status: 'error', fileName: file.name, error: messageOf(error) })
      return
    }
    setView({ ...IDLE_STATE, status: 'busy', fileName: file.name, stage: 'loading-pdf' })
    const completed: OcrPageResult[] = []
    try {
      // —— pdfjs-dist 只在此处动态加载，不进主包 ——
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      let pdf: PDFDocumentProxy
      try {
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
          .promise
        pdf = doc
      } catch (error) {
        throw new Error(describePdfError(error), { cause: error })
      }
      checkOcrPageCount(pdf.numPages)
      const total = pdf.numPages

      // —— tesseract.js 只在此处动态加载；语言包走 CDN 默认配置 ——
      let worker: Awaited<ReturnType<typeof createWorker>>
      try {
        const { createWorker } = await import('tesseract.js')
        setView((prev) => (prev.status === 'busy' ? { ...prev, stage: 'loading-engine' } : prev))
        worker = await createWorker(language, undefined, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setView((prev) =>
                prev.status === 'busy' ? { ...prev, pageFraction: m.progress ?? 0 } : prev,
              )
            }
          },
        })
      } catch (error) {
        throw new Error(describeOcrEngineError(error), { cause: error })
      }

      try {
        for (let i = 1; i <= total; i += 1) {
          setView((prev) =>
            prev.status === 'busy'
              ? { ...prev, stage: 'recognizing', total, done: i - 1, pageFraction: 0 }
              : prev,
          )
          const page = await pdf.getPage(i)
          const viewport = page.getViewport({ scale: OCR_RENDER_SCALE })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          const ctx = canvas.getContext('2d')
          if (!ctx) throw new Error('当前环境不支持 Canvas，无法渲染 PDF 页面')
          await page.render({ canvasContext: ctx, canvas, viewport }).promise
          const { data } = await worker.recognize(canvas)
          completed.push({ page: i, text: cleanOcrText(data.text) })
          setView((prev) => (prev.status === 'busy' ? { ...prev, done: i } : prev))
        }
      } finally {
        await worker.terminate()
      }
      setView((prev) => ({ ...prev, status: 'done', stage: null, pages: completed }))
    } catch (error) {
      // 优雅降级：引擎/渲染失败时，已完成页面的结果保留在 pages 里
      setView((prev) => ({ ...prev, status: 'error', error: messageOf(error), pages: completed }))
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>, language: PdfOcrOptions['language']) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file, language)
  }

  const percent =
    view.status === 'busy' ? ocrOverallProgress(view.done, view.total, view.pageFraction) : 100

  return (
    <MultiPanel<PdfOcrInput, PdfOcrOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'chi_sim+eng' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="ocr-file" className={SECONDARY_BUTTON + ' cursor-pointer'}>
              {t('tool.file')}
            </label>
            <input
              id="ocr-file"
              data-testid="file"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => onFileChange(event, options.language)}
            />
            {view.fileName !== '' && (
              <span data-testid="file-name" className="text-xs text-slate-500 dark:text-slate-400">
                {view.fileName}
                {view.total > 0 && ` · 共 ${view.total} 页`}
              </span>
            )}
            <span className="text-xs text-slate-400">
              当前语言：{OCR_LANGUAGE_LABELS[options.language]}
            </span>
          </div>

          {view.status === 'busy' && view.stage !== null && (
            <div>
              <div
                data-testid="progress"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="OCR 进度"
                className="h-2 w-full overflow-hidden rounded bg-slate-200 dark:bg-slate-800"
              >
                <div
                  className="h-full rounded bg-brand transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {ocrStageText(view.stage, view.done, view.total)}（{percent}%）
              </p>
            </div>
          )}

          {view.status === 'error' && view.error !== '' && (
            <p
              role="alert"
              data-testid="ocr-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {view.error}
            </p>
          )}

          {view.status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              选择 PDF 文件后，工具会把每一页渲染成图像再做 OCR 识别。首次使用需从 CDN
              下载识别引擎与语言包，请保持网络畅通；识别全程在本地进行，文件不上传。
            </p>
          )}

          {view.pages.map((page) => (
            <section
              key={page.page}
              className="rounded border border-slate-200 dark:border-slate-700"
            >
              <h4 className="border-b border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                第 {page.page}/{view.total > 0 ? view.total : view.pages.length} 页
              </h4>
              <pre
                data-testid={'ocr-page-' + page.page}
                className="max-h-48 overflow-auto whitespace-pre-wrap p-2 text-sm"
              >
                {page.text === '' ? '（本页未识别出文字）' : page.text}
              </pre>
            </section>
          ))}
        </div>
      )}
      toText={() => mergeOcrPages(view.pages)}
      downloadExt="txt"
    />
  )
}

/** 识别结果文本合并等纯函数见 ./utils；pdfjs/tesseract 的真实类型直接复用库自带声明 */
