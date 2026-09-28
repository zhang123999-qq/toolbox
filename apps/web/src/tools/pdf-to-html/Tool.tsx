import { useState } from 'react'
import type { ChangeEvent } from 'react'
// pdfjs worker 以 Vite `?url` 方式引入：构建时产出为独立 asset，只取 URL 字符串，
// 不把 worker 代码打进主包。文件名已核实：node_modules/pdfjs-dist@6.3.289/build/pdf.worker.min.mjs
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import {
  assertPagesHaveText,
  checkPdfPageCount,
  describePdfLoadError,
  groupItemsIntoLines,
  pdfToHtmlFragments,
  validatePdfFile,
  wrapHtmlDocument,
} from './utils'
import type { PdfLine, PdfTextItem } from './utils'
import type { PdfToHtmlInput, PdfToHtmlOptions } from './schema'

type RunStatus = 'idle' | 'busy' | 'done' | 'error'
type ViewTab = 'preview' | 'source'

interface HtmlViewState {
  readonly status: RunStatus
  readonly fileName: string
  readonly pages: ReadonlyArray<readonly PdfLine[]>
  readonly error: string
  readonly tab: ViewTab
}

const IDLE_STATE: HtmlViewState = {
  status: 'idle',
  fileName: '',
  pages: [],
  error: '',
  tab: 'preview',
}

const EXAMPLE: PdfToHtmlInput = { text: '在右侧点「选择 PDF 文件」，文本层将转为结构化 HTML。' }

/** 从 unknown 取中文错误文案 */
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

const TAB_BUTTON = 'rounded border px-2 py-1 text-xs '
const TAB_ACTIVE = 'border-brand bg-brand text-white'
const TAB_IDLE = 'border-slate-300 dark:border-slate-700'

export default function Tool() {
  const t = useTranslate()
  const [view, setView] = useState<HtmlViewState>(IDLE_STATE)

  const optionDefs: readonly OptionDef<PdfToHtmlOptions>[] = [
    { key: 'detectHeadings', label: '按字号识别标题', kind: 'boolean' },
    { key: 'pageBreaks', label: '页间插入分隔线', kind: 'boolean' },
  ]

  /** 文件入口：pdfjs 动态加载 → 逐页取文本项 → 行分组存 state，渲染由纯函数完成 */
  async function handleFile(file: File): Promise<void> {
    try {
      validatePdfFile(file)
    } catch (error) {
      setView({ ...IDLE_STATE, status: 'error', fileName: file.name, error: messageOf(error) })
      return
    }
    setView({ ...IDLE_STATE, status: 'busy', fileName: file.name })
    try {
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
      let pdf: PDFDocumentProxy
      try {
        pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise
      } catch (error) {
        throw new Error(describePdfLoadError(error), { cause: error })
      }
      checkPdfPageCount(pdf.numPages)
      const pages: PdfLine[][] = []
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const items: PdfTextItem[] = []
        for (const raw of content.items) {
          if (!('str' in raw) || typeof raw.str !== 'string') continue
          const transform = Array.isArray(raw.transform) ? raw.transform : []
          const x = typeof transform[4] === 'number' ? transform[4] : 0
          const y = typeof transform[5] === 'number' ? transform[5] : 0
          const size = typeof transform[0] === 'number' ? Math.abs(transform[0]) : 0
          items.push({ str: raw.str, x, y, fontSize: size })
        }
        pages.push(groupItemsIntoLines(items))
      }
      // 整篇无文本 → 在此处抛错进 error 态（不能留到 render 里再断言）
      assertPagesHaveText(pages)
      setView((prev) => ({ ...prev, status: 'done', pages }))
    } catch (error) {
      setView((prev) => ({ ...prev, status: 'error', error: messageOf(error) }))
    }
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) void handleFile(file)
  }

  function setTab(tab: ViewTab) {
    setView((prev) => ({ ...prev, tab }))
  }

  return (
    <MultiPanel<PdfToHtmlInput, PdfToHtmlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ detectHeadings: true, pageBreaks: true }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(_input, options) => (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="html-file" className={SECONDARY_BUTTON + ' cursor-pointer'}>
              {t('tool.file')}
            </label>
            <input
              id="html-file"
              data-testid="file"
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={onFileChange}
            />
            {view.fileName !== '' && (
              <span data-testid="file-name" className="text-xs text-slate-500 dark:text-slate-400">
                {view.fileName}
              </span>
            )}
            {view.status === 'done' && (
              <div className="ml-auto flex gap-1">
                <button
                  type="button"
                  data-testid="tab-preview"
                  className={TAB_BUTTON + (view.tab === 'preview' ? TAB_ACTIVE : TAB_IDLE)}
                  onClick={() => setTab('preview')}
                >
                  预览
                </button>
                <button
                  type="button"
                  data-testid="tab-source"
                  className={TAB_BUTTON + (view.tab === 'source' ? TAB_ACTIVE : TAB_IDLE)}
                  onClick={() => setTab('source')}
                >
                  源码
                </button>
              </div>
            )}
          </div>

          {view.status === 'busy' && (
            <p data-testid="converting" className="text-sm text-slate-500">
              正在提取文本并转换…
            </p>
          )}

          {view.status === 'error' && view.error !== '' && (
            <p
              role="alert"
              data-testid="html-error"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {view.error}
            </p>
          )}

          {view.status === 'idle' && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              选择 PDF 文件后，文本层将转为结构化 HTML：标题、列表、段落保留语义， 可在「预览 /
              源码」间切换，「下载」导出为独立网页文件。
            </p>
          )}

          {view.status === 'done' &&
            (view.tab === 'preview' ? (
              <div
                data-testid="html-preview"
                className="prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: pdfToHtmlFragments(view.pages, options) }}
              />
            ) : (
              <pre
                data-testid="html-source"
                className="max-h-96 overflow-auto whitespace-pre-wrap break-all font-mono text-xs"
              >
                {pdfToHtmlFragments(view.pages, options)}
              </pre>
            ))}
        </div>
      )}
      toText={(_input, options) =>
        view.status === 'done'
          ? wrapHtmlDocument(pdfToHtmlFragments(view.pages, options), view.fileName || 'document')
          : ''
      }
      downloadExt="html"
    />
  )
}
