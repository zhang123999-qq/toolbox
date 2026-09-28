import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import {
  checkPdfPageCount,
  combinePages,
  describePdfLoadError,
  extractPageText,
  validatePdfFile,
} from './utils'
import type { PdfTextItem } from './utils'
import type { PdfExtractInput, PdfExtractOptions } from './schema'

/**
 * 文件入口：pdfjs 动态加载 → 逐页取文本项 → 纯函数重组行 → 按页合并。
 * pdfjs 只在此处出现，utils 保持 Node 可测（本工具 deps 为 pdfjs-dist，非 pdf-lib）。
 */
async function extractFile(file: File): Promise<string> {
  validatePdfFile(file)
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
  let pdf: Awaited<typeof loadingTask.promise>
  try {
    pdf = await loadingTask.promise
  } catch (error) {
    throw new Error(describePdfLoadError(error), { cause: error })
  }
  checkPdfPageCount(pdf.numPages)

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const items: PdfTextItem[] = []
    for (const raw of content.items) {
      if (!('str' in raw)) continue // TextMarkedContent 没有文本，只处理 TextItem
      if (typeof raw.str !== 'string' || raw.str === '') continue
      const transform = Array.isArray(raw.transform) ? raw.transform : []
      const x = typeof transform[4] === 'number' ? transform[4] : 0
      const y = typeof transform[5] === 'number' ? transform[5] : 0
      items.push({ str: raw.str, x, y, hasEOL: raw.hasEOL === true })
    }
    pages.push(extractPageText(items))
  }
  const text = combinePages(pages)
  if (text.trim() === '') throw new Error('该 PDF 未提取到文本，可能是扫描件（图片型 PDF）')
  return text
}

export default function Tool() {
  const t = useTranslate()

  return (
    <TwoColumn<PdfExtractInput, PdfExtractOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      fileInput={{ label: t('tool.file'), accept: '.pdf,application/pdf', onFile: extractFile }}
      idleText="点左下「选择文件」上传 PDF，文本将按页提取到右侧"
    />
  )
}
