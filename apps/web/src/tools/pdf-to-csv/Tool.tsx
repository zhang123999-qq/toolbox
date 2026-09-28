import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { checkPdfPageCount, describePdfLoadError, pdfToCsv, validatePdfFile } from './utils'
import type { PdfCellItem } from './utils'
import type { PdfToCsvInput, PdfToCsvOptions } from './schema'

/**
 * 文件入口：pdfjs 动态加载 → 逐页取文本项 → 映射为 PdfCellItem → 纯函数转 CSV。
 * pdfjs 只在此处出现，utils 保持可单元测试。
 */
async function convertFile(file: File, options: PdfToCsvOptions): Promise<string> {
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

  const pages: PdfCellItem[][] = []
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const items: PdfCellItem[] = []
    for (const raw of content.items) {
      if (!('str' in raw) || typeof raw.str !== 'string' || raw.str === '') continue
      const transform = Array.isArray(raw.transform) ? raw.transform : []
      const x = typeof transform[4] === 'number' ? transform[4] : 0
      const y = typeof transform[5] === 'number' ? transform[5] : 0
      items.push({ str: raw.str, x, y })
    }
    pages.push(items)
  }
  return pdfToCsv(pages, options.delimiter)
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<PdfToCsvOptions>[] = [
    { key: 'delimiter', label: '列分隔符', kind: 'select', values: [',', ';', 'tab'] },
  ]

  return (
    <TwoColumn<PdfToCsvInput, PdfToCsvOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ delimiter: ',' }}
      optionDefs={optionDefs}
      fileInput={{ label: t('tool.file'), accept: '.pdf,application/pdf', onFile: convertFile }}
      idleText="点左下「选择文件」上传 PDF，文本将按行列启发式转为 CSV"
    />
  )
}
