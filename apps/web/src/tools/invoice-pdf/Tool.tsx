import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildInvoiceData, buildPdf, toPlainText } from './utils'
import type { PdfResult } from './utils'
import type { InvoiceInput } from './schema'

/** 示例：小额设计发票 */
const EXAMPLE: InvoiceInput = {
  text: 'Website design,1,8000\nDomain renewal,2,100',
  seller: 'Acme Studio',
  buyer: 'Globex Ltd',
  number: 'INV-2026-0001',
  date: '2026-09-28',
  taxRate: '6',
  notes: 'Pay within 15 days',
}

const extraInputs: readonly ExtraInputDef[] = [
  { key: 'seller', label: '销方', rows: 1 },
  { key: 'buyer', label: '购方', rows: 1 },
  { key: 'number', label: '发票号', rows: 1 },
  { key: 'date', label: '日期', rows: 1 },
  { key: 'taxRate', label: '税率（%）', rows: 1 },
  { key: 'notes', label: '备注', rows: 2 },
]

const INITIAL_INPUT: InvoiceInput = {
  text: '',
  seller: '',
  buyer: '',
  number: '',
  date: '',
  taxRate: '',
  notes: '',
}

/** 复制/下载用的纯文本：能组装成发票就用排版版，失败则退回原始输入 */
function invoiceText(input: InvoiceInput): string {
  try {
    return toPlainText(buildInvoiceData(input))
  } catch {
    return input.text
  }
}

export default function Tool() {
  const [pdf, setPdf] = useState<PdfResult | null>(null)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)

  /** 生成 PDF 并触发浏览器下载：二进制走 Blob，不经过模板的文本下载通道 */
  async function exportPdf(input: InvoiceInput): Promise<void> {
    setWorking(true)
    setError('')
    try {
      const result = await buildPdf(input)
      setPdf(result)
      const bytes = new Uint8Array(result.bytes) // 精确拷贝，保证 .buffer 可安全传给 Blob
      const blob = new Blob([bytes.buffer], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${meta.slug}.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setPdf(null)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setWorking(false)
    }
  }

  function renderOutput(input: InvoiceInput) {
    return (
      <div className="flex flex-col gap-2">
        <div>
          <button
            type="button"
            data-testid="export-pdf"
            className={SECONDARY_BUTTON}
            disabled={working}
            onClick={() => void exportPdf(input)}
          >
            {working ? '生成中…' : '生成并下载 PDF'}
          </button>
        </div>
        {error === '' ? null : (
          <p
            role="alert"
            data-testid="export-error"
            className="text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {pdf === null ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            明细每行格式为「品名,数量,单价」（英文逗号）；含中文会报错。
          </p>
        ) : (
          <p data-testid="pdf-info" className="text-sm text-slate-600 dark:text-slate-300">
            已生成 PDF：{pdf.pages} 页，{(pdf.bytes.length / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
    )
  }

  return (
    <MultiPanel<InvoiceInput, Record<string, never>>
      meta={meta}
      initialInput={INITIAL_INPUT}
      initialOptions={{}}
      example={EXAMPLE}
      extraInputs={extraInputs}
      renderOutput={renderOutput}
      toText={invoiceText}
      downloadExt="txt"
    />
  )
}
