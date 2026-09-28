import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import {
  checkPdfPageCount,
  describePdfLoadError,
  groupItemsIntoLines,
  pdfToMarkdown,
  validatePdfFile,
} from './utils'
import type { PdfLine, PdfTextItem } from './utils'
import type { PdfToMarkdownInput, PdfToMarkdownOptions } from './schema'

/**
 * 文件入口：pdfjs 动态加载 → 逐页取文本项 → 映射为 PdfTextItem → 纯函数转 Markdown。
 * pdfjs 只在此处出现，utils 保持可单元测试。
 */
async function convertFile(file: File, options: PdfToMarkdownOptions): Promise<string> {
  validatePdfFile(file)
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
  return pdfToMarkdown(pages, options)
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<PdfToMarkdownOptions>[] = [
    { key: 'detectHeadings', label: '按字号识别标题', kind: 'boolean' },
    { key: 'pageBreaks', label: '页间插入分隔线', kind: 'boolean' },
  ]

  return (
    <TwoColumn<PdfToMarkdownInput, PdfToMarkdownOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ detectHeadings: true, pageBreaks: true }}
      optionDefs={optionDefs}
      fileInput={{ label: t('tool.file'), accept: '.pdf,application/pdf', onFile: convertFile }}
      idleText="点左下「选择文件」上传 PDF，文本层将转为 Markdown"
    />
  )
}
